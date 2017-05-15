export class RecordAnalysisController {
  constructor ($http, $state, API_URL, $scope, $filter, $auth) {
    'ngInject';

    this.$auth = $auth;
    if(!this.$auth.isAuthenticated())
      this.$state.go('home');

    this.$http = $http;
    this.$state = $state;
    this.$filter = $filter;
    this.API_URL = API_URL;
    this.samplingRate = 250;
    this.ADC_TO_MV_COEFFICIENT = 0.01465;
    this.MILLIS_IN_ONE_DAY = 8.64e+7;
    this.pageStart = 0;
    this.pageEnd = 0;
    this.dataLength = 0;
    this.selectedPId = null;
    this.analysis = null;
    this.allRecords = null;
    this.recordsToDisplay = null
    this.selectedRecord = null;
    this.selectedRecordStr = null;
    this.displayChoice = "all";
    this.pData = [];
    this.rrData = [];
    this.pvc = [];
    this.selectedType = "ECG";

    this.type = [
      "ECG",
      "PPG",
      "ACC",
      "IMP"
    ];

    this.showPVCPlot = this.showPVCPlot.bind(this);

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
      customClass: this.getDayClass.bind(this),
      maxDate: new Date(2038, 1, 19),
      minDate: new Date(1970, 1, 1),
      startingDay: 1
    };
    this.opened = false;

    this.getPatients();
    d3.select(window).on('resize', () => {
      this.clearPoincareChart();
      this.clearChart();
      this.clearPVCPlot();
      if(this.rrIntervals && this.pvcLocations && this.pvcMarkers){
        this.makePoincarePlot();
        this.drawChart();
      }
    });
  }

  getPatients(){
    this.$http.get(this.API_URL+'api/patients')
      .then(result => {
        this.patients = result.data;
        if(this.patients.length > 0){
          this.selectedPId = this.patients[0].patientId;
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
          const sorted = records.sort((a,b) => b.timeStamp - a.timeStamp);
          const formatted = sorted.map(rec => {
            let type = rec.type.toUpperCase();
            return {
              patientId: rec.patientId,
              timeStamp: rec.timeStamp,
              type: type.substr(0, 3)
            }
          });
          let recOfSelectedType = formatted.filter(r => r.type == this.selectedType);
          this.allRecords = recOfSelectedType.map(r => {
            let date = this.$filter('date')(r.timeStamp, 'dd.MM.yyyy | HH:mm:ss');
            return Object.assign(r, {recStr: ''+date});
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
    this.selectedRecord = null;
    this.recordsToDisplay = null;
    if(this.displayChoice == "all"){
      this.recordsToDisplay = this.allRecords;
    }else if(this.displayChoice == "filtered"){
      this.recordsToDisplay = this.getFilteredRecords();
    }
    this.selectedRecord = this.recordsToDisplay.filter(r => r.type === "ECG")[0];
    this.getRecordData();
  }

  getFilteredRecords(){
    this.pData = [];
    this.rrData = [];
    this.pvc = [];
    this.clearPoincareChart();
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
    this.getRecordData();
  }

  onTypeSelected(type){
    this.selectedType = type;
    this.getRecordsByPatientId();
  }

  getRecordData(){
    this.pData = [];
    this.rrData = [];
    this.pvc = [];
    this.clearPoincareChart();
    this.clearChart();
    this.clearPVCPlot();
    if(this.selectedRecord){
      const patientId = this.selectedRecord.patientId,
            timeStamp = this.selectedRecord.timeStamp,
            type = this.selectedRecord.type;
      this.$http.get(`${this.API_URL}api/record-analysis?timeStamp=${timeStamp}
      &patientId=${patientId}&type=${type}`)
      .then(result => {
        this.analysis = result.data;
        if(this.analysis && this.hasProperties(this.analysis)){
          this.isECG = (this.analysis.type.toUpperCase() === "ECG");
          this.rrIntervals = (this.analysis.rrIntervals ? this.analysis.rrIntervals.signal : null);
          this.pvcLocations = (this.analysis.pvcEvents ? this.analysis.pvcEvents.locs : null);
          this.pvcMarkers = (this.analysis.pvcEvents ? this.analysis.pvcEvents.markers : null);
          if(this.rrIntervals && this.pvcLocations && this.pvcMarkers){
            this.formatChartData();
            this.makePoincarePlot();
            this.drawChart();
          }
        }
        this.$http.get(`${this.API_URL}api/full-record-data?timeStamp=${timeStamp}
        &patientId=${patientId}&type=${type}`)
        .then(res => {
          this.recData = res.data;
          if(this.recData && this.hasProperties(this.recData)){
            this.duration = this.getDuration(this.recData.endTimeStamp,
                                            this.recData.startTimeStamp);
          }
        });
      });
    }
  }

  hasProperties(obj){
    let len = Object.getOwnPropertyNames(obj).length;
    return len > 0;
  }

  getDuration(end, start){
    return Math.round((end - start) * 0.001);
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
  getEvents(){
    return this.allRecords.map(r => {
      return {
        date: new Date(r.timeStamp),
        status: 'record-available'
      };
    });
  }
  getDayClass(data) {
    let events = this.getEvents();
    let date = data.date;
    let mode = data.mode;
    if (mode === 'day') {
      let dayToCheck = new Date(date).setHours(0,0,0,0);
      for (let i = 0; i < events.length; i++) {
        let currentDay = new Date(events[i].date).setHours(0,0,0,0);
        if (dayToCheck === currentDay) {
          return events[i].status;
        }
      }
    }
    return '';
  }
  handleDateChanged(){
    this.recordsToDisplay = this.getFilteredRecords();
    this.selectedRecord = this.recordsToDisplay.filter(r => r.type === "ECG")[0];
    this.getRecordData();
  }

  formatChartData(){
    if(!this.rrIntervals){
      return;
    }
    this.pData = [];
    this.rrData = [];
    this.pvc = [];
    this.nonpvc = [];
    let xValue;
    for(let i=0; i < this.rrIntervals.length; i++){
      let sample = this.rrIntervals[i];
      let loc = i+1;
      if((i % 2) == 0){
        xValue = sample;
      }else{
        if(this.pvcLocations.indexOf(loc) >= 0){
          this.pvc.push({x: xValue, y: sample});
        }else{
          this.nonpvc.push({x: xValue, y: sample});
        }
        this.pData.push({x: xValue, y: sample});
      }
      this.rrData.push({x: i+1, y: sample});
    }
  }

  makePoincarePlot(){
    if(this.pData.length < 1 || this.rrData.length < 1 || this.pvc.length < 1 || this.nonpvc.length < 1){
      return;
    }
    this.clearPoincareChart();
    let outerWidth = 600,
        outerHeight = 500,
        margin = 40,
        width = outerWidth - margin*2,
        height = outerHeight - margin*2,
        data = {
          pData: this.pData || [],
          rrData: this.rrData || [],
          pvc: this.pvc || [],
          nonpvc: this.nonpvc || []
        };
    const svg = d3.select('#poincare-chart').append('svg')
      .attr('height', outerHeight)
      .attr('width', outerWidth);

    let rrEven = data.pData.reduce((a, v) => a + v.y, 0);
    let meanRREven = rrEven/data.pData.length;
    let rrOdd = data.pData.reduce((a, v) => a + v.x, 0);
    let meanRROdd = rrOdd/data.pData.length;
    let eHeight = 0;
    let eWidth = 0;
    if(this.analysis.hrvFeatures){
      eHeight = this.analysis.hrvFeatures.features.SD1*(height/8);
      eWidth = this.analysis.hrvFeatures.features.SD2*(width/8);
    }

    let lineData1 = data.pData.map(d =>{
      return {
        x: d.x,
        y: (-1*d.x)+(meanRROdd + meanRREven)
      }
    });
    let lineData2 = data.pData.map(d =>{
      return {
        x: d.x,
        y: d.x+(meanRROdd - meanRREven)
      }
    });
    let maxY = Math.max(d3.max(lineData1, d => d.y), d3.max(lineData2, d => d.y)),
        maxX = Math.max(d3.max(lineData2, d => d.x), d3.max(lineData1, d => d.x)),
        minY = Math.min(d3.min(lineData1, d => d.y), d3.min(lineData2, d => d.y)),
        minX = Math.min(d3.min(lineData2, d => d.x), d3.min(lineData1, d => d.x)),
        maxXDomain = Math.max(maxX, d3.max(data.pData, d => d.x)),
        maxYDomain = Math.max(maxY, d3.max(data.pData, d => d.y)),
        minXDomain = Math.min(minX, d3.min(data.pData, d => d.x)),
        minYDomain = Math.min(minY, d3.min(data.pData, d => d.y));

    //x-y scale generators
    const y = d3.scaleLinear()
      .domain([minYDomain, maxYDomain])
      .range([height, 0]);

    const x = d3.scaleLinear()
      .domain([minXDomain, maxXDomain])
      .range([0, width]);

    //x-y axis generators
    const yAxis = d3.axisLeft(y)
                    .ticks(5)
                    .tickSize(-1*width, 0, 0);
    const xAxis = d3.axisBottom(x)
                    .ticks(5)
                    .tickSize(-1*height, 0, 0);

    const chartGroup = svg.append('g')
      .attr('height', height)
      .attr('width', width)
      .attr('transform', 'translate('+margin+','+margin+')');

    let gy = chartGroup.append('g')
      .attr('class', 'poincare-grid')
      .call(yAxis);

    let gx = chartGroup.append('g')
      .attr('class', 'poincare-grid')
      .attr('transform', 'translate(0,'+height+')')
      .call(xAxis);

    chartGroup.append('text')
    .attr('fill', 'black')
    .attr('x', ((width/2)-margin*1.75))
    .attr('y', (margin*-1.5))
    .attr('dy', '3em')
    .text('POINCARE PLOT');
    chartGroup.append('text')
    .attr('fill', 'black')
    .attr('x', ((width/2)-margin*0.75))
    .attr('y', (height+margin*0.75))
    .text('RR(i)');
    chartGroup.append('text')
    .attr('fill', 'black')
    .attr('x', (height/-2))
    .attr('transform', 'rotate(-90)')
    .attr('y', (margin*-0.75))
    .text('RR(i+1)');

    let view = chartGroup.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none');

    chartGroup.selectAll('circle')
      .data(data.nonpvc)
      .enter().append('circle')
      .attr('class', 'poincare-non-pvc')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r','5')
      .attr('fill', 'blue');
    chartGroup.selectAll('circle')
      .data(data.pData)
      .enter().append('circle')
      .attr('class', 'poincare-pvc')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r','5')
      .attr('fill', 'red');

    //Line generator (used to draw dashed lines)
    let intersectLine = d3.line()
      .x(d => x(d.x))
      .y(d => y(d.y));

    chartGroup.append('path')
      .attr('class', 'intersect-line1')
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 5)
      .attr('stroke-dasharray', ('5,5'))
      .attr('d', intersectLine(lineData1))

    chartGroup.append('path')
      .attr('class', 'intersect-line2')
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 5)
      .attr('stroke-dasharray', ('5,5'))
      .attr('d', intersectLine(lineData2))

    chartGroup.append('ellipse')
      .attr('class', 'poincare-center')
      .attr('cx', x(meanRREven) )
      .attr('cy', y(meanRROdd))
      .attr('ry', eHeight)
      .attr('rx', eWidth)
      .attr('stroke', 'red')
      .attr('fill', 'none')
      .attr('stroke-width', 4);

    let zoom = d3.zoom()
        .scaleExtent([1, 4])
        .translateExtent([[-100, -100], [width + 90, height + 100]])
        .on('zoom', () => {
          let t = d3.event.transform;
          view.attr('transform', t)
          gx.call(xAxis.scale(t.rescaleX(x)));
          gy.call(yAxis.scale(t.rescaleY(y)));
        svg.selectAll('circle')
          .attr('cx', d => t.applyX(x(d.x)))
          .attr('cy', d => t.applyY(y(d.y)));
        });

    svg.call(zoom);
  }

  clearPoincareChart(){
    if(d3.select('#poincare-chart').select('svg')){
      d3.select('#poincare-chart').select('svg').remove();
    }
  }

  drawChart(){
    this.clearChart();
    if(this.rrData.length < 1){
      return;
    }
    const options = setOptions();
    options.data = this.rrData;
    options.pvc = options.data.filter(v => {
      if(this.pvcLocations.includes(v.x)){
        return v;
      }
    });
    const svg = d3.select('#rr-chart-container').append('svg')
      .attr('height', options.outerHeight)
      .attr('width', options.outerWidth);

      //x-y scale generators
      const y = d3.scaleLinear()
        .domain([d3.min(options.data, d => d.y), d3.max(options.data, d => d.y)])
        .range([options.height, 0]);
      const x = d3.scaleLinear()
        .domain([d3.min(options.data, d => d.x), d3.max(options.data, d => d.x)])
        .range([0, options.width]);

      //x-y axis generators
      const yAxis = d3.axisLeft(y);
      const xAxis = d3.axisBottom(x);

      //Line generator (used to draw chart path)
      let line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveNatural);

      const chartGroup = svg.append('g')
        .attr('transform', 'translate('+options.margin+','+options.margin+')');

      chartGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#B0C4DE')
        .attr('stroke-width', '1')
        .attr('d', line(options.data));

      chartGroup.append('g')
        .attr('class', 'axis y')
        .call(yAxis);
      chartGroup.append('g')
        .attr('class', 'axis x')
        .attr('transform', 'translate(0,' + options.height +')')
        .call(xAxis);

      chartGroup.append('text')
      .attr('fill', 'black')
      .attr('x', ((options.width/2) - options.margin*1.75))
      .attr('y', (options.margin*-1.5))
      .attr('dy', '3em')
      .text('TACHOGRAM (RR Interval Signal)');
      chartGroup.append('text')
      .attr('fill', 'black')
      .attr('x', ((options.width/2) - options.margin))
      .attr('y', (options.height + options.margin))
      .text('RR Intervals (i = 1,2,...n)');

      chartGroup.selectAll('circle')
        .data(options.pvc)
        .enter().append('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r','5')
        .attr('fill', 'red')
        .on('mouseover', function(){
          d3.select(this)
          .attr('r', '10')
          .attr('fill-opacity', 0.5);
        })
        .on('mouseout', function(){
          d3.select(this)
          .attr('r', '5')
          .attr('fill-opacity', 1);
        })
        .on('click', this.showPVCPlot);
  }

  showPVCPlot(element, index){
    if(this.recData && this.pvcMarkers){
      let markers = this.pvcMarkers[index];
      let start = (markers[0] - 100) >= 0 ? markers[0] - 100 : 0;
      let end = (markers[1] + 100) < this.recData.chOne.length ?
                                      markers[1] + 100 :
                                      this.recData.chOne.length-1;
      let pvcIndex = [markers[0] - start, (markers[0] - start)+(markers[1]-markers[0])];
      let data = this.recData.chOne.slice(start, end).map((d, i) => {
        return {x: i, y: d};
      });

      this.clearPVCPlot();
      if(data.length < 1){
        return;
      }
      let outerHeight = 300,
          outerWidth = 400,
          height = 240,
          width = 340,
          margin = 30;
      const svg = d3.select('#pvc-plot').append('svg')
        .attr('height', outerHeight)
        .attr('width', outerWidth);

        //x-y scale generators
        const y = d3.scaleLinear()
          .domain([d3.min(data, d => d.y), d3.max(data, d => d.y)])
          .range([height, 0]);
        const x = d3.scaleLinear()
          .domain([d3.min(data, d => d.x), d3.max(data, d => d.x)])
          .range([0, width]);

        //x-y axis generators
        const yAxis = d3.axisLeft(y).ticks('0');
        const xAxis = d3.axisBottom(x).ticks('0');

        //Line generator (used to draw chart path)
        let line = d3.line()
          .defined(d => d.y !== null)
          .x(d => x(d.x))
          .y(d => y(d.y))
          .curve(d3.curveNatural);

        const chartGroup = svg.append('g')
          .attr('transform', 'translate('+margin+','+margin+')');

        chartGroup.append('rect')
          .attr('x', x(pvcIndex[0]))
          .attr('y', 0)
          .attr('width', x(pvcIndex[1])- x(pvcIndex[0]))
          .attr('height', height)
          .attr('fill', 'red')
          .attr('opacity', 0.3);

        chartGroup.append('text')
        .attr('fill', 'black')
        .attr('x', ((width/2) - margin*1.75))
        .attr('y', (margin*-2))
        .attr('dy', '3em')
        .text('PVC Event');

        chartGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', 'black')
          .attr('stroke-width', '1')
          .attr('d', line(data));

        chartGroup.append('g')
          .attr('class', 'axis y')
          .call(yAxis);
        chartGroup.append('g')
          .attr('class', 'axis x')
          .attr('transform', 'translate(0,' + height +')')
          .call(xAxis);
    }
  }

  clearChart(){
    if(d3.select('#rr-chart-container').select('svg')){
      d3.select('#rr-chart-container').select('svg').remove();
    }
  }

  clearPVCPlot(){
    if(d3.select('#pvc-plot').select('svg')){
      d3.select('#pvc-plot').select('svg').remove();
    }
  }
}
const setOptions = () => {
  const options = {
    outerWidth: 1100,
    outerHeight: 300,
    height: 240,
    width: 1040,
    margin: 40,
    x: {
    },
    y: {
    }
  };

  return options;
}
