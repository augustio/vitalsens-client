export class RecordRawController {
  constructor ($http, $state, $auth, $filter, $timeout, API_URL) {
    'ngInject';

    this.$auth = $auth;
    if(!this.$auth.isAuthenticated())
      this.$state.go('home');

    this.$http = $http;
    this.$state = $state;
    this.$timeout = $timeout;
    this.$filter = $filter;
    this.API_URL = API_URL;
    this.samplingRate = 250;
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
    this.selectedRecordComponentsParams = null;
    this.currentTemp = null;
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
    d3.select(window).on('resize', () => this.drawChart());
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
            let date = this.$filter('date')(r.timeStamp, 'dd.MM.yyyy');
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
    this.clearChart();
    this.chOne = null;
    if(this.displayChoice == "all"){
      this.recordsToDisplay = this.allRecords;
    }else if(this.displayChoice == "filtered"){
      this.recordsToDisplay = this.getFilteredRecords();
    }
    this.selectedRecord = this.recordsToDisplay.filter(r => r.type === "ECG")[0];
    this.getRecordComponents();
  }

  getFilteredRecords(){
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
    this.chOne = this.chTwo = this.chThree = null;
    this.clearChart();
    this.chOne = null;
    this.getRecordComponents();
  }

  getRecordComponents(){
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
    this.clearChart();
    this.chOne = null;
    this.selectedRecordComponent = component;
    this.pageStart = this.pageEnd = 0;
    this.getRecordDetail();
  }

  getRecordDetail(){
    if(this.selectedRecordComponent){
      const _id = this.selectedRecordComponent._id;
      if(_id != null){
        this.$http.get(`${this.API_URL}api/record-details?_id=${_id}`)
        .then(result => {
          this.isECG = (result.data.type.toUpperCase() === "ECG");
          this.chOne = result.data.chOne;
          this.chTwo = result.data.chTwo
          this.chThree = result.data.chThree;
          this.dataLength = this.chOne.length;
          this.currentTemp = result.data.temp;
          this.drawChart();
        });
      }
    }
  }

  getDuration(end, start){
    return Math.round((end - start) * 0.001);
  }

  printChart(){
    this.printing = true;
    this.drawChart();
    this.$timeout(() => {window.print();}, 1000);
  }

  printViewBackBtnHandler(){
    this.printing = false;
    this.drawChart();
  }

  drawChart(){
    this.clearChart();
    if(this.chOne === null){
      console.log("chOne is null");
      return;
    }
    const options = setOptions();
    this.pageSize = options.itemsPerPage;
    const end = this.pageStart + options.itemsPerPage;
    this.pageEnd = end < this.dataLength ? end : this.dataLength;
    if(this.pageEnd <= this.pageStart){
      return;
    }
    const durationPerSample = 1/this.samplingRate; //In seconds
    let data1 = this.chOne.slice(this.pageStart, this.pageEnd);
    let data2 = this.chTwo.slice(this.pageStart, this.pageEnd);
    let data3 = this.chThree.slice(this.pageStart, this.pageEnd);
    if(data1.length < options.itemsPerPage){
      data1 = [
        ...data1,
        ...(Array(options.itemsPerPage - data1.length).fill(null))
      ];
    }
    if(data2.length < options.itemsPerPage){
      data2 = [
        ...data2,
        ...(Array(options.itemsPerPage - data2.length).fill(null))
      ];
    }
    if(data3.length < options.itemsPerPage){
      data3 = [
        ...data3,
        ...(Array(options.itemsPerPage - data3.length).fill(null))
      ];
    }
    options.data.ES = data2.map((e, i) =>{
      return {
        x: i*durationPerSample,
        y: (e == null) ? e : (this.chThree[i] - e) *this.ADC_TO_MV_COEFFICIENT
      };
    });
    options.data.AS = data2.map((e, i) =>{
      return {
        x: i*durationPerSample,
        y: (e == null) ? e : (this.chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
      };
    });
    options.data.AE = data3.map((e, i) => {
      return {
        x: i*durationPerSample,
        y: (e == null) ? e : (this.chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
      };
    });

    const svg = d3.select('#chart-container').append('svg')
      .attr('height', options.outerHeight)
      .attr('width', options.outerWidth);

    //Background grid definition
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

    const dataKeys = Object.keys(options.data);
    dataKeys.forEach( (key, index) => {
      const height = index * (options.innerMargin.bottom*2 + options.innerHeight)
      const titleYPos = options.innerMargin.top + height;

      //Add the title
      svg.append("text")
          .attr("x", options.innerWidth - options.innerMargin.right*2)
          .attr("y", titleYPos)
          .attr("text-anchor", "middle")
          .style("font-size", "14px")
          .style("text-decoration", "underline")
          .text(dataKeys[index]);

      //x-y scale generators
      const y = d3.scaleLinear()
        .domain([-8, 8])
        //.domain([d3.min(options.data[key], d => d.y), d3.max(options.data[key], d => d.y)])
        .range([options.innerHeight, 0]);
      const x = d3.scaleLinear()
        .domain([0, d3.max(options.data[key], d => d.x)])
        .range([0, options.innerWidth]);

      //Progress bar calculations
      const progress = d3.scaleLinear()
        .domain([0, this.dataLength])
        .range([0, 100]);
      this.progressValue = Math.round(progress(this.pageEnd));
      if(this.progressValue == 100){
        this.progressType = "success";
      }else if(this.pageStart == 0){
        this.progressType = "danger";
      }
      else{
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
        .x((d,i) => x(d.x))
        .y((d,i) => y(d.y))
        .curve(d3.curveNatural);

      const chartGroup = svg.append('g')
        .attr('transform', 'translate('+options.innerMargin.left+','+(options.innerMargin.top +  height)+')');

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
        .attr('cx',(d,i) => x(d.x))
        .attr('cy',(d,i) => y(d.y))
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
        zip.file(fileName+".txt", JSON.stringify(data));
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
    if(this.pageEnd < this.dataLength){
      this.pageStart = this.pageEnd;
      this.drawChart();
    }
  }

  handleBackwardBtn(){
    const start = this.pageStart - this.pageSize;
    this.pageStart = start > 0 ? start : 0;
    this.drawChart();
  }

  /*Functions for date picker widget*/
  clear() {
    this.selectedDate = null;
  };
  open() {
    this.opened = true;
  }
  setDate(year, month, day) {
    this.selectedDate = new Date(year, month, day);
  }
  handleDateChanged(){
    this.clearChart();
    this.chOne = null;
    this.recordsToDisplay = this.getFilteredRecords();
    this.selectedRecord = this.recordsToDisplay.filter(r => r.type === "ECG")[0];
    this.getRecordComponents();
    console.log(this.recordsToDisplay);
  }
}

const setOptions = () => {
  const options = {
    data: {},
    innerHeight: 200,
    outerHeight: 800,
    smallGridSize: 5,
    largeGridSize: 25,
    outerMargin: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20
    },
    innerMargin: {
      left: 25,
      right: 25,
      top: 25,
      bottom: 25
    },
    x: {
      ticks: 30
    },
    y: {
      ticks: 8
    }
  };
  const node = d3.select("#chart-container").node();
  if(node){
    options.outerWidth = node.offsetWidth;
  }
  if(options.outerWidth < 750){
    options.innerWidth = 500;
    options.itemsPerPage = 1000;
    options.x.ticks = 5;
    let margin = (options.outerWidth - options.innerWidth)/2;
    margin = margin - (margin%options.largeGridSize);
    options.innerMargin.left = margin;
    options.innerMargin.right = margin;
  }else if(options.outerWidth > 750 && options.outerWidth <= 1000){
    options.innerWidth = 750;
    options.itemsPerPage = 1500;
    options.x.ticks = 5;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }else if(options.outerWidth > 1000 && options.outerWidth <=1250){
    options.innerWidth = 1000;
    options.itemsPerPage = 2000;
    options.x.ticks = 10;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }else if(options.outerWidth > 1250 && options.outerWidth <=1500){
    options.innerWidth = 1250;
    options.itemsPerPage = 2500;
    options.x.ticks = 10;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }else{
    options.innerWidth = 1500;
    options.itemsPerPage = 3000;
    options.x.ticks = 15;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }

  return options;
}
