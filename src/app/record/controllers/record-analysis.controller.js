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
      this.makePoincarePlot();
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
    this.getRecordData();
  }

  getRecordData(){
    this.pData = [];
    this.rrData = [];
    this.pvc = [];
    this.clearChart();
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
          this.rrIntervals = this.analysis.rrIntervals.signal;
          this.pvcLocations = this.analysis.pvcEvents.locs;
          this.pvcMarkers = this.analysis.pvcEvents.markers;
          this.formatChartData();
          this.makePoincarePlot();
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
          this.pData.push({x: xValue, y: sample});
        }
      }
      this.rrData.push({x: i+1, y: sample});
    }
  }

  makePoincarePlot(){
    this.clearChart();
    if(this.pData === null){
      return;
    }
    const node = d3.select("#poincare-chart").node();
    let width,
        height,
        margin = {},
        yRange = {},
        xRange = {},
        data = {
          pData: this.pData || [],
          rrData: this.rrData || [],
          pvc: this.pvc || []
        };
    if(node){
      height = 400;
      width = node.offsetWidth;
      margin.top = 20;
      margin.right = 25;
      margin.bottom = 40;
      margin.left = 40;
      yRange.min = margin.top;
      yRange.max = height - margin.bottom;
      xRange.min = margin.left;
      xRange.max = width - margin.right;
    }
    const svg = d3.select('#poincare-chart').append('svg')
      .attr('height', height)
      .attr('width', width)
      .attr('class', 'poincare-chart-svg');

    //x-y scale generators for axis
    const yA = d3.scaleLinear()
      .domain([d3.min(this.pData, d => d.y), d3.max(this.pData, d => d.y)])
      .range([yRange.max, yRange.min]);
    const xA = d3.scaleLinear()
      .domain([0, d3.max(this.pData, d => d.x)])
      .range([xRange.min, xRange.max]);

    //x-y scale generators for chart
    const y = d3.scaleLinear()
      .domain([d3.min(this.pData, d => d.y), d3.max(this.pData, d => d.y)])
      .range([yRange.max - (margin.bottom*3), yRange.min + (margin.top*3)]);
    const x = d3.scaleLinear()
      .domain([0, d3.max(this.pData, d => d.x)])
      .range([xRange.min + (margin.left), xRange.max - (margin.right*4)]);

    //x-y axis generators
    const yAxis = d3.axisLeft(yA)
                    .ticks(10);
    const xAxis = d3.axisBottom(xA)
                    .ticks(10);

    const chartGroup = svg.append('g').attr('transform', 'translate('+margin.left+',0)');

    let tx = margin.left*-1;
    let ty = height - margin.bottom;

    chartGroup.append('g')
      .attr('class', 'axis y')
      .call(yAxis);
    chartGroup.append('g')
      .attr('class', 'axis x')
      .attr('transform', 'translate('+tx+','+ty+')')
      .call(xAxis);

    chartGroup.selectAll('circle')
      .data(data.pData)
      .enter().append('circle')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r','5')
      .attr('fill', 'blue');

    const d = [
      ...data.pData,
      ...data.pvc
    ];
    chartGroup.selectAll('circle')
      .data(d)
      .enter().append('circle')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r','5')
      .attr('fill', 'red');
  }

  clearChart(){
    if(d3.select('#poincare-chart').select('svg')){
      d3.select('#poincare-chart').select('svg').remove();
    }
  }
}
