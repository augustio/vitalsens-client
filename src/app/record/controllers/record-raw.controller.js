export class RecordRawController {
  constructor ($http, $state, $auth, $filter, $window, $log, $timeout, API_URL) {
    'ngInject';

    this.$auth = $auth;
    if(!this.$auth.isAuthenticated())
      this.$state.go('home');

    this.$http = $http;
    this.$state = $state;
    this.$timeout = $timeout;
    this.$filter = $filter;
    this.$window = $window;
    this.$log = $log;
    this.API_URL = API_URL;
    this.samplingRate = 230;
    this.samplesPerPage = 2300;
    this.ADC_TO_MV_COEFFICIENT = 0.01465;
    this.MILLIS_IN_ONE_DAY = 8.64e+7;
    this.pageStart = 0;
    this.pageEnd = 0;
    this.dataLength = 0;
    this.selectedPId = null;
    this.allRecords = null;
    this.recordsToDisplay = null
    this.selectedRecord = null;
    this.selectedRecordStr = null;
    this.recordComponents = null;
    this.selectedRecordComponent = null;
    this.currentRecordData = null;
    this.progressValue = 0;
    this.progressType = null;
    this.printing = false;
    this.displayChoice = "all";


    this.selectedDate = new Date();
    this.formats = [
      'M!/d!/yyyy',
      'dd-MMMM-yyyy',
      'yyyy/MM/dd',
      'dd.MM.yyyy',
      'shortDate'
    ];
    this.format = this.formats[3];
    this.dateOptions = {
      maxDate: new Date(2038, 1, 19),
      minDate: new Date(1970, 1, 1),
      startingDay: 1
    };
    this.opened = false;

    this.getPatients();
    d3.select(window).on('resize', () => {
      this.clearChart();
      this.drawChart();
    });
  }

  getPatients(){
    this.$http.get(this.API_URL+'api/patients')
      .then(result => {
        this.patients = result.data;
        if(this.patients.length > 0){
          this.selectedPId = (this.patients[0]).patientId;
          this.getRecordsByPatientId();
        }
      });
  }

  getRecordsByPatientId(){
    const pId = this.selectedPId;
    if(pId != null){
      this.$http.get(this.API_URL+'api/records?patientId='+pId)
      .then(result => {
        const records = result.data || [];
        if(records.length > 0){
          const sorted = records.sort((a,b) => a.timeStamp - b.timeStamp);
          const formatted = sorted.map(rec => {
            let type = rec.type.toUpperCase();
            return {
              patientId: rec.patientId,
              timeStamp: rec.timeStamp,
              type: type.substr(0, 3)
            }
          });
          this.allRecords = formatted.map(r => {
            let date = this.$filter('date')(r.timeStamp, 'dd.MM.yyyy_HH:mm:ss');
            return Object.assign(r, {recStr: `${r.type}_${date}`});
          });
          this.handleDisplayChoiceSelection();
        }
      });
    }
  }

  onSelectPatient(pId){
    this.selectedPId = pId;
    this.getRecordsByPatientId();
  }

  handleDisplayChoiceSelection(){
    this.recordComponents = null;
    this.selectedRecord = null;
    this.selectedRecordComponent = null;
    this.selectedRecordComponentsParams = null;
    this.recordsToDisplay = null;
    if(this.displayChoice == "all"){
      this.recordsToDisplay = this.allRecords;
    }else if(this.displayChoice == "filtered"){
      this.recordsToDisplay = this.getFilteredRecords();
    }
    this.selectedRecord = this.recordsToDisplay.filter(r => r.type === "ECG")[0];
    this.getRecordComponents();
  }

  getFilteredRecords(){
    this.chOne = null;
    this.chTwo = null;
    this.chThree = null;
    this.clearChart();
    const date = new Date(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      this.selectedDate.getDate()
    );
    const start = date.valueOf();
    const end = start + this.MILLIS_IN_ONE_DAY;
    const filtered = this.allRecords.filter(value => {
      return value.timeStamp >= start && value.timeStamp < end
    });
    return filtered;
  }

  onRecordSelected(){
    this.getRecordComponents();
  }

  getRecordComponents(){
    this.chOne = null;
    this.chTwo = null;
    this.chThree = null;
    this.clearChart();
    if(this.selectedRecord){
      let {timeStamp, patientId, type} = this.selectedRecord;
      this.$http.get(
        `${this.API_URL}api/record-details?timeStamp=${timeStamp}
        &patientId=${patientId}&type=${type}`
      ).then(result => {
        this.recordComponents = result.data;
        if(this.recordComponents.length > 0){
          this.selectedRecordComponent = this.recordComponents[0];
          this.getRecordDetail();
        }
      });
    }
  }

  onRecordComponentSelected(component){
    this.selectedRecordComponent = component;
    this.getRecordDetail();
  }

  getRecordDetail(){
    this.chOne = null;
    this.chTwo = null;
    this.chThree = null;
    this.pageStart = this.pageEnd = 0;
    this.clearChart();
    if(this.selectedRecordComponent){
      const _id = this.selectedRecordComponent._id;
      if(_id != null){
        this.$http.get(`${this.API_URL}api/record-details?_id=${_id}`)
        .then(result => {
          this.isECG = (result.data.type.toUpperCase() === "ECG");
          this.currentRecordData = this.formatData(result.data);
          this.drawChart();
        });
      }
    }
  }

  formatData(data){
    let channels = 0;
    let d = {};
    const durationPerSample = 1/this.samplingRate; //In seconds
    if(data.chOne.length > 0) channels++;
    if(data.chTwo.length > 0) channels++;
    if(data.chThree.length > 0) channels++;
    d.length = data.chOne.length;
    d.isEmpty = d.length <= 0;
    d.samplesPerPage = data.samplingRate * 8;
    d.numPages = Math.floor(d.length/this.samplesPerPage)
                          + (d.length%this.samplesPerPage > 0 ? 1 : 0);
    d.curPage = 0;
    switch (channels) {
      case 3:
        if(this.isECG){
          d.ES = data.chTwo.map((e, i) =>{
            return {
              x: i*durationPerSample,
              y: (e == null)
                  ? e
                  : (data.chThree[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
          });
          d.AS = data.chTwo.map((e, i) =>{
            return {
              x: i*durationPerSample,
              y: (e == null)
                  ? e
                  : (data.chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
          });
          d.AE = data.chThree.map((e, i) => {
            return {
              x: i*durationPerSample,
              y: (e == null) ? e : (data.chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
          });
        }
        else{
          d.chOne = data.chOne;
          d.chTwo = data.chTwo;
          d.chThree = data.chThree;
        }
        break;
      default:
    }
    return Object.assign(d,{
      type: data.type,
      timeStamp: data.timeStamp,
      patientId: data.patientId,
      samplingRate: data.samplingRate,
      start: data.start,
      end: data.end,
      pEStart: data.pEStart,
      pEEnd: data.pEEnd,
      temp: data.temp
    });
  }

  getDuration(end, start){
    return Math.round((end - start) * 0.001);
  }

  printChart(){
    this.printing = true;
    this.clearChart();
    this.drawChart();
    this.$timeout(() => {this.$window.print();}, 1000);
  }

  printViewBackBtnHandler(){
    this.printing = false;
    this.clearChart();
    this.drawChart();
  }

  drawChart(){
    if(this.currentRecordData.isEmpty){
      return;
    }
    const options = setOptions();
    let start = this.currentRecordData.curPage*this.currentRecordData.samplesPerPage;
    let end = start + this.currentRecordData.samplesPerPage;
    options.data.ES = this.currentRecordData.ES.slice(start, end);
    options.data.AS = this.currentRecordData.AS.slice(start, end);
    options.data.AE = this.currentRecordData.AE.slice(start, end);
    const svg = d3.select('#chart-container').append('svg')
      .attr('height', options.outerHeight)
      .attr('width', options.outerWidth);

    //Background grid definition for ECG data
    if(this.isECG){
      const defs = svg.append('defs');
      const smallGrid = defs.append('pattern')
        .attr('id', 'small-grid')
        .attr('width', options.smallGridSize)
        .attr('height', options.smallGridSize)
        .attr('patternUnits', 'userSpaceOnUse');
      smallGrid.append('path')
        .attr('d', 'M '+options.smallGridSize+' 0 L 0 0 0 '+options.smallGridSize)
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-width', '0.5');
      const grid = defs.append('pattern')
        .attr('id', 'grid')
        .attr('width', options.largeGridSize)
        .attr('height', options.largeGridSize)
        .attr('patternUnits', 'userSpaceOnUse')
      grid.append('rect')
        .attr('width', options.largeGridSize)
        .attr('height', options.largeGridSize)
        .attr('fill', 'url(#small-grid)');
      grid.append('path')
        .attr('d', 'M '+options.largeGridSize+' 0 L 0 0 0 '+options.largeGridSize)
        .attr('fill', 'none')
        .attr('stroke', 'red')
        .attr('stroke-width', '1');
      svg.append('rect')
        .attr('height', '100%')
        .attr('width', options.outerWidth)
        .attr('class', 'chart-box');
      svg.append('rect')
        .attr('height', '100%')
        .attr('width', options.outerWidth)
        .attr('class', 'chart-bg');
    }

    const dataKeys = Object.keys(options.data);
    dataKeys.forEach( (key, index) => {
      const height = index * (options.margin.bottom + options.innerHeight)
      const titleYPos = options.margin.top + height;

      //Add the title
      svg.append("text")
          .attr("x", options.innerWidth - options.margin.right*2)
          .attr("y", titleYPos)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("text-decoration", "underline")
          .text(dataKeys[index]);

      //x-y scale generators
      const y = d3.scaleLinear()
        .domain([-4, 8])
        .range([options.innerHeight, 0]);
      let mnX = options.data.ES[0].x;
      let mxX = mnX + options.maxXDomain;
      const x = d3.scaleLinear()
        .domain([mnX, mxX])
        .range([0, options.outerWidth]);

      //Progress bar calculations
      const progress = d3.scaleLinear()
        .domain([0, (this.currentRecordData.numPages -1)])
        .range([0, 100]);
      this.progressValue = Math.round(progress(this.currentRecordData.curPage));
      if(this.progressValue == 100){
        this.progressType = "success";
      }else{
        this.progressType = null;
      }

      //x-y axis generators
      const yAxis = d3.axisLeft(y)
                      .ticks(options.y.ticks);
      const xAxis = d3.axisBottom(x)
                      .ticks(options.x.ticks);

      //Line generator (used to draw chart path)
      let line = d3.line()
        .defined(d => d.y !== null)
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveNatural);

      const chartGroup = svg.append('g')
        .attr('transform', 'translate('+options.margin.left+','+(options.margin.top +  height)+')');

      chartGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', '1')
        .attr('d', line(options.data[key]));

      chartGroup.append('g')
        .attr('class', 'axis y')
        .call(yAxis);
      chartGroup.append('g')
        .attr('class', 'axis x')
        .attr('transform', 'translate(0,' + options.innerHeight +')')
        .call(xAxis);

      chartGroup.selectAll('circle')
        .data(options.data[key])
        .enter().append('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r','5')
        .attr('stroke', 'red')
        .attr('stroke-width', '0')
        .attr('fill', 'transparent')
        .on('mouseover', function(){
          d3.select(this)
          .attr('stroke-width', '1')
          .attr('fill', 'blue')
        })
        .on('mouseout', function(){
          d3.select(this)
          .attr('stroke-width', '0')
          .attr('fill', 'transparent')
        });
    });
  }

  clearChart(){
    if(d3.select('#chart-container').select('svg')){
      d3.select('#chart-container').select('svg').remove();
    }
  }

  downloadData(){
    const record = angular.fromJson(this.selectedRecord);
    const timeStamp = record.timeStamp;
    const patientId = record.patientId;
    const type = record.type;
    if(timeStamp != null && patientId != null && type != null){
      this.$http.get(this.API_URL+'api/full-record-data?timeStamp='+timeStamp+'&patientId='+patientId+'&type='+type)
        .then(result => {
        let data = result.data;
        let zip = new JSZip();
        let fileName = patientId+"_"+timeStamp+"_"+type;
        zip.file(fileName+".txt", angular.toJson(data));
        zip.generateAsync({type:"blob"})
        .then(function(content){
            saveAs(content, fileName+".zip");
        });
      });
    }
  }

  reloadComponents(){
    this.$state.reload("record-components");
  }

  handleForwardBtn(){
    if(this.currentRecordData.curPage < this.currentRecordData.numPages -1){
      this.currentRecordData.curPage++;
      this.clearChart();
      this.drawChart();
    }
  }

  handleBackwardBtn(){
    if(this.currentRecordData.curPage > 0){
      this.currentRecordData.curPage--;
      this.clearChart();
      this.drawChart();
    }
  }

  /*Functions for date picker widget*/
  clear() {
    this.selectedDate = null;
  }
  open() {
    this.opened = true;
  }
  setDate(year, month, day) {
    this.selectedDate = new Date(year, month, day);
  }
  handleDateChanged(){
    this.recordsToDisplay = this.getFilteredRecords();
    this.selectedRecord = this.recordsToDisplay.filter(r => r.type === "ECG")[0];
    this.getRecordComponents();
  }
}

const setOptions = () => {
  const options = {
    data: {},
    innerWidth: 1250,
    outerWidth: 1300,
    innerHeight: 200,
    outerHeight: 800,
    smallGridSize: 5,
    largeGridSize: 25,
    margin: {
      left: 25,
      right: 25,
      top: 25,
      bottom: 25
    },
    x: {
      ticks: 10
    },
    y: {
      ticks: 8
    },
    maxXDomain: 10
  };
  const node = d3.select("#chart-container").node();
  if(node){
    options.outerWidth = node.offsetWidth;
    const scale = d3.scaleLinear()
                    .domain([0, options.maxXDomain])
                    .range([0, options.outerWidth]);
    options.smallGridSize = scale(0.04);
    options.largeGridSize = scale(0.2);
    options.margin.left = options.margin.right = options.margin.top = options.margin.bottom = options.largeGridSize*2;
    options.innerHeight = options.largeGridSize * 6;
    options.outerHeight = (options.innerHeight * 3)+(options.margin.top * 4);
  }

  return options;
}
