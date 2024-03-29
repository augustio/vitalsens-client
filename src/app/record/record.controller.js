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

      this.curRRIndex = 0;
      this.RRGraphWindow = 250;
      this.curRRGraphData = [];

      this.getRecordDetail();

      this.drawEventsChart = this.drawEventsChart.bind(this);
      this.drawRRChart = this.drawRRChart.bind(this);
      this.nextRRData = this.nextRRData.bind(this);
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
        this.rrGraphData =
        this.rrIntervals.map((v, i) => {
                          return {x: i+1, y: v};
                        });
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
        this.nextRRData();
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
    let data = this.curRRGraphData;
    let eventsLocations = [];
    let eventsMarkers = [];
    if(this.analysisType === 'pvc') {
      eventsLocations = this.pvcEvents.locs || [];
      eventsMarkers = this.pvcEvents.markers || [];
    }
    if(this.analysisType === 'afib'){
      eventsLocations = this.afibEvents.locs || [];
      eventsMarkers = this.afibEvents.markers || [];
    }
    let e = data.filter(v => {
      if(eventsLocations.includes(v.x)){
        return v;
      }
    });
    let events = e.map(v => {
      let markers = eventsMarkers[eventsLocations.indexOf(v.x)]
      v.markers = markers;
      return v;
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
      .attr('fill', 'steelblue')
      .attr('x', ((width/2) - margin*1.75))
      .attr('y', (margin*-1.5))
      .attr('dy', '3em')
      .style('font-weight', 'bold')
      .text('TACHOGRAM (RR Interval Signal)');
      chartGroup.append('text')
      .attr('fill', 'black')
      .attr('x', ((width/2) - margin))
      .attr('y', (height + margin))
      .text('RR Intervals (i = 1,2,...n)');

      chartGroup.selectAll('circle')
        .data(events)
        .enter()
        .filter(d => d.y >= 0)
        .append('circle')
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

      chartGroup.append('text')
      .attr('class', 'next-rr-data-btn')
      .attr('fill', 'steelblue')
      .attr('x', width)
      .attr('y', (margin/2))
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('>>')
      .on('mouseover', function(){
        d3.select(this)
        .style('font-size', '18px')
        .attr('opacity', '0.5');
      })
      .on('mouseout', function(){
        d3.select(this)
        .style('font-size', '16px')
        .attr('opacity', '1');
      })
      .on('click', () => {
        this.clearRRChart();
        this.nextRRData();
        this.drawRRChart();
      });
  }

  clearRRChart(){
    if(d3.select('#rr-chart-container').select('svg')){
      d3.select('#rr-chart-container').select('svg').remove();
    }
  }

  nextRRData(){
    let idx = this.curRRIndex;
    let i = idx + this.RRGraphWindow;
    this.curRRIndex = 0;
    if(i < this.rrGraphData.length){
      this.curRRIndex = i;
    }
    this.curRRGraphData =  this.rrGraphData.slice(idx, i);
  }

  drawEventsChart(d){
    let title;
    if(this.analysisType === 'pvc'){
      title = 'PVC Event';
    }
    if(this.analysisType === 'afib'){
      title = 'AFIB Event';
    }
    if(this.recordData && d.markers){
      let recData = this.formatRecordData(true);
      let start = (d.markers[0] - 500) >= 0 ? d.markers[0] - 500 : 0;
      let end = (d.markers[1] + 500) < recData.ES.length ?
      d.markers[1] + 500 :
      recData.ES.length-1;
      let eventIndex = [d.markers[0] - start, (d.markers[0] - start)+(d.markers[1]- d.markers[0])];
      let data = recData.ES.slice(start, end);
      if(this.analysisType === 'afib'){
        let end = data.length > 1750 ? 1750 : data.length;
        data = data.slice(0, end);
        eventIndex = [0, end - 1];
      }
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
        .attr('fill', 'steelblue')
        .attr('x', ((width/2) - margin*1.75))
        .attr('y', (margin*-2))
        .attr('dy', '3em')
        .style('font-weight', 'bold')
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
          .attr('stroke', 'steelblue')
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

  drawPoincareChart(){
    if(this.rrIntervals.length < 1 ){
      return;
    }
    this.clearPoincareChart();
    let rrOdd = this.rrGraphData
      .filter(v => v.x%2 !== 0)
      .map(v => v.y);
    let rrEven = this.rrGraphData
      .filter(v => v.x%2 === 0)
      .map(v => v.y);
    if(rrOdd.length < 1 || rrEven.length < 1)
      return;
    let pData = rrEven.map((v,i) => {
      return {x: rrOdd[i], y: v}
    });
    let pvcLocs = this.pvcEvents.locs || [];
    let pvc = this.rrGraphData
      .filter(v => pvcLocs.includes(v.x))
      .map(v => v.y);
    let meanRROdd = d3.mean(rrOdd);
    let meanRREven = d3.mean(rrEven);
    rrOdd = rrOdd.sort((a, b) => a - b);
    let outerWidth = 620,
      outerHeight = 620,
      margin = 40,
      width = outerWidth - margin*2,
      height = outerHeight - margin*2,
      data = {
        pData,
        line1: rrOdd.map(v => ({
          x: v,
          y: -1*v+(meanRROdd + meanRREven)
        })),
        line2: rrOdd.map(v => ({
          x: v,
          y: v+(meanRROdd - meanRREven)
        })),
        cx: meanRREven,
        cy: meanRROdd,
        pvc
      };

    const svg = d3.select('#poincare-chart-container').append('svg')
      .attr('height', outerHeight)
      .attr('width', outerWidth);
    let eHeight = 0;
    let eWidth = 0;
    if(this.hrvFeatures){
      eHeight = this.hrvFeatures.SD1*(height/16);
      eWidth = this.hrvFeatures.SD2*(width/16);
    }

    //x-y scale generators
    let yMax = d3.max(data.pData, d => d.y);
    let yMin = d3.min(data.pData, d => d.y);
    let xMax = d3.max(data.pData, d => d.x);
    let xMin = d3.min(data.pData, d => d.x);
    const y = d3.scaleLinear()
      .domain([
        yMin - (yMax - yMin),
        yMax + (yMax - yMin)
      ]).range([height, 0]);

    const x = d3.scaleLinear()
      .domain([
        xMin - (xMax - xMin),
        xMax + (xMax - xMin)
      ]).range([0, width]);

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
        .attr('stroke-width', 5)
        .attr('transform', 'translate('+margin+','+margin+')');

    let gy = chartGroup.append('g')
      .attr('class', 'poincare-grid')
      .call(yAxis);

    let gx = chartGroup.append('g')
      .attr('class', 'poincare-grid')
      .attr('transform', 'translate(0,'+height+')')
      .call(xAxis);

    chartGroup.append('text')
      .attr('fill', 'steelblue')
      .attr('x', ((width/2)-margin*1.75))
      .attr('y', (margin*-1.5))
      .attr('dy', '3em')
      .style('font-weight', 'bold')
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

    let points = chartGroup.selectAll('circle')
      .data(data.pData);

    chartGroup.selectAll('circle')
    .data(data.pData)
    .enter().append('circle')
    .attr('class', 'poincare-non-pvc')
    .attr('cx', d => x(d.x))
    .attr('cy', d => y(d.y))
    .attr('r','5')
    .attr('fill', (d => {
      return (data.pvc.includes(d.x) || data.pvc.includes(d.y)) ?
        'red' :
        'blue';
    }));

    //Line generator (used to draw dashed lines)
    let intersectLine = d3.line()
      .x(d => x(d.x))
      .y(d => y(d.y));

    chartGroup.append('path')
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 5)
      .attr('stroke-dasharray', '5,5')
      .attr('d', intersectLine(data.line1))

    chartGroup.append('path')
      .attr('fill', 'none')
      .attr('stroke', 'green')
      .attr('stroke-width', 5)
      .attr('stroke-dasharray', '5,5')
      .attr('d', intersectLine(data.line2))

    chartGroup.append('ellipse')
      .attr('class', 'poincare-center')
      .attr('cx', x(data.cx) )
      .attr('cy', y(data.cy))
      .attr('ry', eHeight)
      .attr('rx', eWidth)
      .attr('transform', 'rotate(-45,' + x(data.cx) + ',' + y(data.cy) + ')')
      .attr('stroke', 'steelblue')
      .attr('fill', 'none')
      .attr('stroke-width', 4);

    let zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on('zoom', () => {
        let t = d3.event.transform;
        gx.call(xAxis.scale(t.rescaleX(x)));
        gy.call(yAxis.scale(t.rescaleY(y)));
        chartGroup.selectAll('circle')
          .attr('cx', d => {
            if(d.x > meanRROdd)
              return x(d.x +(d.x - meanRROdd)*t.k);
            else
              return x(meanRROdd - (meanRROdd - d.x)*t.k);
          })
          .attr('cy', d => {
            if(d.y > meanRREven)
              return y(d.y +(d.y - meanRREven)*t.k);
            else
              return y(meanRREven - (meanRREven - d.y)*t.k);
          });
        chartGroup.selectAll('ellipse').remove();
        chartGroup.append('ellipse')
          .attr('class', 'poincare-center')
          .attr('cx', x(data.cx))
          .attr('cy', y(data.cy))
          .attr('ry', eHeight*t.k)
          .attr('rx', eWidth*t.k)
          .attr('transform', 'rotate(-45,' + x(data.cx) + ',' + y(data.cy) + ')')
          .attr('stroke', 'steelblue')
          .attr('fill', 'none')
          .attr('stroke-width', 4);
      });

    svg.call(zoom);
  }

  clearPoincareChart(){
    if(d3.select('#poincare-chart-container').select('svg')){
      d3.select('#poincare-chart-container').select('svg').remove();
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

  handleForwardBtn(){
    let idx = this.recSegments.indexOf(this.currentRecSegment);
    let max = this.recSegments.length - 1;
    if(idx < max){idx += 1;}
    this.currentRecSegment = this.recSegments[idx];
    this.updateRawChart();
  }

  handleBackwardBtn(){
    let idx = this.recSegments.indexOf(this.currentRecSegment);
    if(idx > 0){idx -= 1;}
    this.currentRecSegment = this.recSegments[idx];
    this.updateRawChart();
  }

  updateRawChart(){
    this.currentPage = this.recSegments.indexOf(this.currentRecSegment);
    this.clearRawChart();
    this.drawRawChart();
  }

  setAnalysisType(type){
    this.analysisType = type;
    this.$timeout(() => {
      this.clearEventsChart();
      if(type === 'alarm'){
        this.clearRRChart();
        this.clearPoincareChart();
      }else if(type === 'poincare'){
        this.clearRRChart();
        this.drawPoincareChart();
      }else if(type === 'afib' || type === 'pvc'){
        this.clearPoincareChart();
        this.clearRRChart();
        this.drawRRChart();
      }
    }, 500);
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
