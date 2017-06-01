export class RecordController {
  constructor ($http, $auth, $state, $timeout, $window, API_URL) {
      'ngInject';

      this.$auth = $auth;
      this.$state = $state;

      if(!this.$auth.isAuthenticated()){
        this.$state.go('login');
        return;
      }

      this.$http = $http;
      this.$timeout = $timeout;
      this.$window = $window;
      this.API_URL = API_URL;
      this.ADC_TO_MV_COEFFICIENT = 0.01465;
      this.MILLIS_IN_ONE_DAY = 8.64e+7;
      this.record = null;
      this.recordData = null;
      this.recordAnalysis = null;
      this.printing = false;

      this.progressValue = 0;
      this.currentPage = 0;
      this.pages = 0;
      this.period = 0;
      this.pageSize = 0;
      this.channels = 0;

      this.getRecordDetail();

      d3.select(window).on('resize', () => {
        this.clearECGChart();
        this.drawECGChart();
      });
  }

  getRecordDetail(){
    let record_id = this.$state.params.record_id;
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
        this.pageSize = this.record.samplingRate * 7.5 //7.5pages
        this.pages = Math.floor(this.record.size/this.pageSize)
                              + (this.record.size%this.pageSize > 0 ? 1 : 0);
        this.period = 1/this.record.samplingRate; //In seconds
      }
      if(results.recordData){
        this.recordData = results.recordData;
        if(this.recordData.chOne.length > 0) this.channels++;
        if(this.recordData.chTwo.length > 0) this.channels++;
        if(this.recordData.chThree.length > 0) this.channels++;
        this.drawECGChart();
      }
      if(results.recordAnalysis){this.recordAnalysis = results.recordAnalysis;}
    });
  }

  formatRecordData(){
    let d = {};
    let start = this.currentPage*this.pageSize;
    let end = start + this.pageSize;
    let chOne = this.recordData.chOne.slice(start, end);
    let chTwo = this.recordData.chTwo.slice(start, end);
    let chThree = this.recordData.chThree.slice(start, end);
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
          d.chOne = chOne;
          d.chTwo = chTwo;
          d.chThree = chThree;
        }
        break;
      default:
    }
    return d;
  }

  drawECGChart(){
    if(!this.recordData){
      return;
    }
    const options = setOptions();

    options.data = this.formatRecordData();

    const svg = d3.select('#chart-container').append('svg')
      .attr('height', options.outerHeight)
      .attr('width', options.outerWidth);

    //Background grid definition for ECG data
    if(this.record.type === 'ECG'){
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
        .domain([d3.min(options.data[key], d => d.y), d3.max(options.data[key], d => d.y)])
        .range([options.innerHeight, 0]);
      let mnX = 0;
      if(this.record.type === 'ECG') {mnX = options.data.ES[0].x;}
      let mxX = mnX + options.maxXDomain;
      const x = d3.scaleLinear()
        .domain([mnX, mxX])
        .range([0, options.outerWidth]);

      //Progress bar calculations
      const progress = d3.scaleLinear()
        .domain([0, (this.pages -1)])
        .range([0, 100]);
      this.progressValue = Math.round(progress(this.currentPage));
      if(this.progressValue == 100){
        this.progressType = "success";
      }else{
        this.progressType = null;
      }

      //x-y axis generators
      const yAxis = d3.axisLeft(y)
                      .ticks(0);
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

  clearECGChart(){
    if(d3.select('#chart-container').select('svg')){
      d3.select('#chart-container').select('svg').remove();
    }
  }

  printChart(){
    this.printing = true;
    this.clearECGChart();
    this.drawECGChart();
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
    this.clearECGChart();
    this.drawECGChart();
  }

  handleForwardBtn(){
    if(this.currentPage < this.pages -1){
      this.currentPage++;
      this.clearECGChart();
      this.drawECGChart();
    }
  }

  handleBackwardBtn(){
    if(this.currentPage > 0){
      this.currentPage--;
      this.clearECGChart();
      this.drawECGChart();
    }
  }

  goToRecords(){
    this.$state.go('home', {patientId: this.record.patientId});
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
    options.margin.left = options.margin.right = options.margin.top = options.largeGridSize;
    options.margin.bottom = options.largeGridSize * 2;
    options.innerHeight = options.largeGridSize * 4;
    options.outerHeight = (options.innerHeight * 3)+(options.margin.bottom * 3);
  }

  return options;
}
