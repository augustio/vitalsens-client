export class RecordController {
  constructor ($http, $auth, $state, $timeout, $filter, $window, API_URL) {
      'ngInject';

      this.$auth = $auth;
      this.$state = $state;

      if(!this.$auth.isAuthenticated()){
        this.$state.go('login');
        return;
      }

      this.$http = $http;
      this.$timeout = $timeout;
      this.$filter = $filter;
      this.$window = $window;
      this.API_URL = API_URL;
      this.ADC_TO_MV_COEFFICIENT = 0.01465;
      this.MILLIS_IN_ONE_DAY = 8.64e+7;
      this.record = null;
      this.recordData = null;
      this.analysisAvailable = false;
      this.printing = false;

      this.currentPage = 0;
      this.pages = 0;
      this.period = 0;
      this.pageSize = 0;
      this.channels = 0;
      this.recSegments = [];
      this.analysisType = 'pvc';

      this.alarmsItemsPerPage = 10;
      this.currentAlarmsPage = 1;

      this.getRecordDetail();

      this.drawEventsChart = this.drawEventsChart.bind(this);
      this.drawRRChart = this.drawRRChart.bind(this);
      this.clearEventsChart = this.clearEventsChart.bind(this);

      d3.select(window).on('resize', () => {
        this.clearRawChart();
        this.drawRawChart();
      });
  }

  getRecordDetail(){
    let record_id = this.$state.params.record_id;
    this.pageOnList = this.$state.params.currentPage;
    if(record_id == null) { return; }
    async.parallel({
      record: callback => {
        this.$http.get(this.API_URL+'api/records/'+record_id)
          .then( successRes => {
            callback(null, successRes.data)
          });
      },
      recordData: callback => {
        this.$http.get(this.API_URL+'api/records/'+record_id+'/data')
        .then( successRes => {
          callback(null, successRes.data)
        });
      },
      recordAnalysis: callback =>  {
        this.$http.get(this.API_URL+'api/records/'+record_id+'/analysis')
        .then( successRes => {
          callback(null, successRes.data)
        });
      }
    }, (err, results) => {
      if(results.recordAnalysis){
        this.recordAnalysis = results.recordAnalysis;
      }
      if(results.record){
        this.record = results.record;
        this.pageSize = this.record.samplingRate * 7 //7 seconds
        this.period = 1/this.record.samplingRate; //In seconds
        if(this.record.type === 'ACC'){
          this.period = 1/16;
          this.pageSize = 16*7;
        }
        this.pages = Math.floor(this.record.size/this.pageSize)
                              + (this.record.size%this.pageSize > 0 ? 1 : 0);
        let a = Array(this.pages).fill(0);
        this.recSegments = a.map((s, i) => {
          let tStamp = this.record.recStart + i*7000;
          let from = this.$filter('date')(tStamp, 'HH:mm:ss');
          let to = this.$filter('date')(tStamp + 7000, 'HH:mm:ss');
          return `${from} - ${to}`;
        });
        this.currentRecSegment = this.recSegments[0];
      }
      if(results.recordData){
        this.recordData = results.recordData;
        if(this.recordData.chOne.length > 0) this.channels++;
        if(this.recordData.chTwo.length > 0) this.channels++;
        if(this.recordData.chThree.length > 0) this.channels++;
        this.drawRawChart();
      }
      if(results.recordAnalysis){
        this.analysisAvailable = true;
        this.rrIntervals = results.recordAnalysis.rrIntervals || [];
        this.pvcEvents = results.recordAnalysis.pvcEvents || {};
        this.afibEvents = results.recordAnalysis.afibEvents || [];
        this.hrvFeatures = results.recordAnalysis.hrvFeatures || [];
        this.alarms = results.recordAnalysis.alarms || [];
        this.alarms = this.alarms.map(a => {
          let alarm = {};
          if(this.record){
            let start = this.record.recStart;
            let end = this.record.recEnd;
            let size = this.record.size;
            const scale = d3.scaleLinear()
              .domain([0, size])
              .range([start, end]);
            let from = this.$filter('date')(scale(a.data.ecg_marker[0]), 'HH:mm:ss');
            let to = this.$filter('date')(scale(a.data.ecg_marker[1]), 'HH:mm:ss');
            Object.assign(alarm, a, {timePeriod: `${from} - ${to}`});
          }else{
            Object.assign(alarm, a, {timePeriod: 'N/A'});
          }
          return alarm;
        });
        this.alarmsCount = this.alarms.length;
        this.onAlarmsPageChange();
        this.rPeaks = results.recordAnalysis.rPeaks || {};
        this.drawRRChart();
      }
    });
  }

  onAlarmsPageChange(){
    let start = (this.currentAlarmsPage - 1)*this.alarmsItemsPerPage,
        end = start + this.alarmsItemsPerPage;
    this.currentAlarms = this.alarms.slice(start, end);
  }

  formatRecordData(allData){
    let d = {};
    let start = this.currentPage*this.pageSize;
    let end = start + this.pageSize;
    let chOne = this.recordData.chOne.slice(start, end);
    let chTwo = this.recordData.chTwo.slice(start, end);
    let chThree = this.recordData.chThree.slice(start, end);
    if(allData){
      chOne = this.recordData.chOne;
      chTwo = this.recordData.chTwo;
      chThree = this.recordData.chThree;
    }
    switch (this.channels) {
      case 1:
        break;
      case 2:
        break;
      case 3:
        if(this.record.type === 'ECG'){
          d.ES = chTwo.map((e, i) =>{
            return {
              x: i*this.period,
              y: (e == null)
                  ? e
                  : (chThree[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
          });
          d.AS = chTwo.map((e, i) =>{
            return {
              x: i*this.period,
              y: (e == null)
                  ? e
                  : (chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
          });
          d.AE = chThree.map((e, i) => {
            return {
              x: i*this.period,
              y: (e == null) ? e : (chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
          });
        }
        else{
          d.chOne = chOne.map((e, i) => {
            return{x: i*this.period, y: e}
          });
          d.chTwo = chTwo.map((e, i) => {
            return{x: i*this.period, y: e}
          });
          d.chThree = chThree.map((e, i) => {
            return{x: i*this.period, y: e}
          });
        }
        break;
      default:
    }
    return d;
  }

  drawRawChart(){
    if(!this.recordData){
      return;
    }
    const options = setOptions();

    options.data = this.formatRecordData();

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
      const height = index * (options.margin.bottom + options.innerHeight)
      const titleYPos = options.margin.top + height;

    //x-y scale generators
    const y = d3.scaleLinear()
      .domain([d3.min(options.data[key], d => d.y), d3.max(options.data[key], d => d.y)])
      .range([options.innerHeight, 0]);
    let mnX = 0;
    if(this.record.type === 'ECG') {mnX = options.data.ES[0].x;}
    let mxX = mnX + options.maxXDomain;
    const x = d3.scaleLinear()
      .domain([mnX, mxX])
      .range([0, options.outerWidth]);

    //Add the title
    let delta = 14 - (options.outerWidth/1300)*14;
    let titleFontSize = delta > 0 ? 14 - delta*0.75 : 14;
    svg.append("text")
        .attr("x", options.outerWidth - options.margin.left*2)
        .attr("y", titleYPos)
        .attr("text-anchor", "middle")
        .style("font-size", titleFontSize)
        .style("text-decoration", "underline")
        .text(dataKeys[index]);

    //x-y axis generators
    const yAxis = d3.axisLeft(y)
                    .ticks(0);
    const xAxis = d3.axisBottom(x)
                    .ticks(options.x.ticks);

    //Line generator (used to draw chart path)
    let line = d3.line()
      .defined(d => d.y !== null && !Number.isNaN(d.y))
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
      .attr('class', 'y-axis')
      .call(yAxis);
    chartGroup.append('g')
      .attr('class', 'x-axis')
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

  clearRawChart(){
    if(d3.select('#chart-container').select('svg')){
      d3.select('#chart-container').select('svg').remove();
    }
  }

  drawRRChart(){
    this.clearRRChart();
    if(this.rrIntervals.length < 1){
      return;
    }
    let height = 200;
    let width = 1040;
    let margin = 40;
    let outerHeight = 280;
    let outerWidth = 1100;
    let data = this.rrIntervals.map((v, i) => {
      return {x: i+1, y: v};
    });
    let eventsLocations = [];
    if(this.analysisType === 'pvc') {
      eventsLocations = this.pvcEvents.locs || [];
    }
    if(this.analysisType === 'afib'){
      eventsLocations = this.afibEvents.locs || [];
    }
    let events = data.filter(v => {
      if(eventsLocations.includes(v.x)){
        return v;
      }
    });
    const svg = d3.select('#rr-chart-container').append('svg')
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
      const yAxis = d3.axisLeft(y);
      const xAxis = d3.axisBottom(x);

      //Line generator (used to draw chart path)
      let line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveNatural);

      const chartGroup = svg.append('g')
        .attr('transform', 'translate('+margin+','+margin+')');

      chartGroup.append('path')
        .attr('fill', 'none')
        .attr('stroke', '#B0C4DE')
        .attr('stroke-width', '1')
        .attr('d', line(data));

      chartGroup.append('g')
        .attr('class', 'axis y')
        .call(yAxis);
      chartGroup.append('g')
        .attr('class', 'axis x')
        .attr('transform', 'translate(0,' + height +')')
        .call(xAxis);

      chartGroup.append('text')
      .attr('fill', 'black')
      .attr('x', ((width/2) - margin*1.75))
      .attr('y', (margin*-1.5))
      .attr('dy', '3em')
      .text('TACHOGRAM (RR Interval Signal)');
      chartGroup.append('text')
      .attr('fill', 'black')
      .attr('x', ((width/2) - margin))
      .attr('y', (height + margin))
      .text('RR Intervals (i = 1,2,...n)');

      chartGroup.selectAll('circle')
        .data(events)
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
        .on('click', this.drawEventsChart);
  }

  clearRRChart(){
    if(d3.select('#rr-chart-container').select('svg')){
      d3.select('#rr-chart-container').select('svg').remove();
    }
  }

  drawEventsChart(element, index){
    let eventMarkers = null;
    let title;
    if(this.analysisType === 'pvc'){
      eventMarkers = this.pvcEvents.markers;
      title = 'PVC Event';
    }
    if(this.analysisType === 'afib'){
      eventMarkers = this.afibEvents.markers;
      title = 'AFIB Event';
    }
    if(this.recordData && eventMarkers){
      let recData = this.formatRecordData(true);
      let markers = eventMarkers[index];
      let start = (markers[0] - 500) >= 0 ? markers[0] - 500 : 0;
      let end = (markers[1] + 500) < recData.ES.length ?
                                      markers[1] + 500 :
                                      recData.ES.length-1;
      let eventIndex = [markers[0] - start, (markers[0] - start)+(markers[1]-markers[0])];
      let data = recData.ES.slice(start, end);

      this.clearEventsChart();
      if(data.length < 1){
        return;
      }
      let outerHeight = 250,
          outerWidth = 1100,
          height = 200,
          width = 1040,
          margin = 30;
      const svg = d3.select('#events-chart-container').append('svg')
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
          .attr('x', x(data[eventIndex[0]].x))
          .attr('y', 0)
          .attr('width', x(data[eventIndex[1]].x)- x(data[eventIndex[0]].x))
          .attr('height', height)
          .attr('fill', 'red')
          .attr('opacity', 0.3);

        chartGroup.append('text')
        .attr('fill', 'black')
        .attr('x', ((width/2) - margin*1.75))
        .attr('y', (margin*-2))
        .attr('dy', '3em')
        .text(title);

        chartGroup.append('text')
        .attr('fill', 'red')
        .attr('x', width)
        .attr('y', (margin/2))
        .attr('class', 'event-plot-delete-btn')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('X')
        .on('mouseover', function(){
          d3.select(this)
          .style('font-size', '18px')
          .attr('fill', 'blue');
        })
        .on('mouseout', function(){
          d3.select(this)
          .style('font-size', '16px')
          .attr('fill', 'red');
        })
        .on('click', () => {
          this.clearEventsChart();
          this.drawRRChart();
        });

        chartGroup.append('path')
          .attr('fill', 'none')
          .attr('stroke', '#B0C4DE')
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

  clearEventsChart(){
    if(d3.select('#events-chart-container').select('svg')){
      d3.select('#events-chart-container').select('svg').remove();
    }
  }

  printChart(){
    this.printing = true;
    this.clearRawChart();
    this.drawRawChart();
    let css = '@page { size: landscape; }',
      head = document.head || document.getElementsByTagName('head')[0],
      style = document.createElement('style');
    style.type = 'text/css';
    style.media = 'print';
    if (style.styleSheet){
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);

    this.$timeout(() => {this.$window.print();}, 1000);
  }

  printViewBackBtnHandler(){
    this.printing = false;
    this.clearRawChart();
    this.drawRawChart();
  }

  updateRawChart(){
    this.currentPage = this.recSegments.indexOf(this.currentRecSegment);
    this.clearRawChart();
    this.drawRawChart();
  }

  setAnalysisType(type){
    this.analysisType = type;
    this.clearEventsChart();
    if(type === 'alarm'){
      this.clearRRChart();
    }else if(type === 'poincare'){
      this.clearRRChart();
    }else{
      this.clearRRChart();
      this.drawRRChart();
    }
  }

  goToRecords(){
    this.$state.go('home', {
      patientId: this.record.patientId,
      currentPage: this.pageOnList,
      currentRecordId: this.record._id
    });
  }

  downloadData(){
    if(this.recordData){
      let zip = new JSZip();
      let fileName = this.record._id;
      zip.file(fileName+".txt", angular.toJson(this.recordData));
      zip.generateAsync({type:"blob"})
      .then(function(content){
          saveAs(content, fileName+".zip");
      });
    }
  }
}

const setOptions = () => {
  const options = {
    innerWidth: 1250,
    outerWidth: 1300,
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
    maxXDomain: 8
  };
  const node = d3.select("#chart-container").node();
  if(node){
    options.outerWidth = node.offsetWidth;
    const scale = d3.scaleLinear()
                    .domain([0, options.maxXDomain])
                    .range([0, options.outerWidth]);
    options.smallGridSize = scale(0.04);
    options.largeGridSize = scale(0.2);
    options.margin.left = options.largeGridSize * 2;
    options.margin.right = options.largeGridSize;
    options.margin.top = options.largeGridSize * 2;
    options.margin.bottom = options.largeGridSize * 2;
    options.innerHeight = options.largeGridSize * 3;
    options.outerHeight = (options.innerHeight * 4)+(options.margin.bottom * 3);
  }

  return options;
}
