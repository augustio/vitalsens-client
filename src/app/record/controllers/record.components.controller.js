export class RecordComponentsController {
  constructor ($http, $state, $auth, $filter, API_URL) {
    'ngInject';

    this.$http = $http;
    this.$state = $state;
    this.$auth = $auth;
    this.$filter = $filter;
    this.API_URL = API_URL;
    this.samplingRate = 250;
    this.ADC_TO_MV_COEFFICIENT = 0.01465;
    this.pageStart = 0;
    this.pageEnd = 0;
    this.dataLength = 0;

    if(!this.$auth.isAuthenticated())
      this.$state.go('home');

    this.getRecordComponents();
  }

  getRecordComponents(){
    if(this.$auth.record === undefined ||
    !this.$auth.record.timeStamp && !this.$auth.record.patientId && !this.$auth.record.type){
      this.$auth.record = {
        timeStamp: this.$state.params.timeStamp,
        patientId: this.$state.params.patientId,
        type: this.$state.params.type
      }
    }
    this.timeStamp = this.$state.params.timeStamp || this.$auth.record.timeStamp;
    this.patientId = this.$state.params.patientId || this.$auth.record.patientId;
    this.type = this.$state.params.type || this.$auth.record.type;
    if(this.timeStamp != null && this.patientId != null && this.type != null){
      this.$http.get(
        `${this.API_URL}api/record-details?timeStamp=
        ${this.timeStamp}&patientId=${this.patientId}&type=${this.type}`
      ).then(result => {
        this.components = result.data;
        if(this.components.length > 0){
          this.componentIndex = 0;
          this.selectedComponent = this.components[this.componentIndex];
          this.getRecordDetail();
        }
      });
    }else{
      this.$state.go('patient');
    }
  }

  getRecordDetail(){
    this._id = this.components[this.componentIndex]._id;
    if(this._id != null){
      this.$http.get(`${this.API_URL}api/record-details?_id=${this._id}`)
      .then(result => {
        this.isECG = (result.data.type.toUpperCase() === "ECG");
        this.chOne = result.data.chOne;
        this.chTwo = result.data.chTwo
        this.chThree = result.data.chThree;
        this.dataLength = this.chOne.length;
        this.drawChart();
        d3.select(window).on('resize', () => this.drawChart())
      });
    }
  }

  getDuration(end, start){
    return Math.round((end - start) * 0.001);
  }

  drawChart(){
    if(d3.select('#chart-container').select('svg')){
      d3.select('#chart-container').select('svg').remove();
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
    options.data.chOne = data1.map((e, i) =>{
      return {
        x: i*durationPerSample,
        y: (e == null) ? e : (this.chThree[i] - e) *this.ADC_TO_MV_COEFFICIENT
      };
    });
    options.data.chTwo = data2.map((e, i) =>{
      return {
        x: i*durationPerSample,
        y: (e == null) ? e : (this.chThree[i] - e) *this.ADC_TO_MV_COEFFICIENT
      };
    });
    options.data.chThree = data3.map((e, i) => {
      return {
        x: i*durationPerSample,
        y: (e == null) ? e : (this.chOne[i] - e) *this.ADC_TO_MV_COEFFICIENT
      };
    });

    const svg = d3.select('#chart-container').append('svg')
      .attr('height', options.outerHeight)
      .attr('width', options.outerWidth);
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
      .attr('width', '100%')
      .attr('class', 'chart-bg');

    //x-y scale generators
    const y = d3.scaleLinear()
      .domain([d3.min(options.data.chTwo, d => d.y), d3.max(options.data.chTwo, d => d.y)])
      .range([options.innerHeight, 0]);
    const x = d3.scaleLinear()
      .domain([0, d3.max(options.data.chTwo, d => d.x)])
      .range([0, options.innerWidth]);

    //x-y axis generators
    const yAxis = d3.axisLeft(y).ticks(options.y.ticks);
    const xAxis = d3.axisBottom(x).ticks(options.x.ticks);

    //Line generator (used to draw chart path)
    let line = d3.line()
      .defined(d => d.y !== null)
      .x((d,i) => x(d.x))
      .y((d,i) => y(d.y))
      .curve(d3.curveNatural);

    const chartGroup = svg.append('g')
      .attr('transform', 'translate('+options.innerMargin.left+','+options.innerMargin.top+')');

    chartGroup.append('path')
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('d', line(options.data.chTwo));

    chartGroup.append('g')
      .attr('class', 'axis y')
      .call(yAxis);
    chartGroup.append('g')
      .attr('class', 'axis x')
      .attr('transform', 'translate(0,' +options.innerHeight+')')
      .call(xAxis);

    chartGroup.selectAll('circle')
      .data(options.data.chTwo)
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
  }

  downloadData(){
    var vm = this;
    vm.timeStamp = this.timeStamp;
    vm.patientId = this.patientId;
    vm.type = this.type;
    if(vm.timeStamp != null && vm.patientId != null && vm.type != null){
      this.$http.get(this.API_URL+'api/full-record-data?timeStamp='+vm.timeStamp+'&patientId='+vm.patientId+'&type='+vm.type)
        .then(function(result){
        var data = result.data;
        var zip = new JSZip();
        var fileName = vm.patientId+"_"+vm.$filter('date')(vm.timeStamp, "ddMMyy")+"_"+vm.type;
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

  handleRecordComponentSelect(index){
    this.selectedComponent = this.components[index];
    this.componentIndex = index;
    this.pageStart = this.pageEnd = 0;
    this.getRecordDetail();
  }

}

const setOptions = () => {
  const options = {
    data: {
      chOne: [],
      chTwo: [],
      chThree: []
    },
    innerHeight: 150,
    outerHeight: 700,
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
      bottom: 0
    },
    x: {
      ticks: 30
    },
    y: {
      ticks: 5
    }
  };
  const node = d3.select("#chart-container").node();
  if(node){
    options.outerWidth = node.offsetWidth;
  }
  if(options.outerWidth < 750){
    options.innerWidth = 500;
    options.itemsPerPage = 500;
    options.x.ticks = 20;
    let margin = (options.outerWidth - options.innerWidth)/2;
    margin = margin - (margin%options.largeGridSize);
    options.innerMargin.left = margin;
    options.innerMargin.right = margin;
  }else if(options.outerWidth > 750 && options.outerWidth <= 1000){
    options.innerWidth = 750;
    options.itemsPerPage = 750;
    options.x.ticks = 25;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }else if(options.outerWidth > 1000 && options.outerWidth <=1250){
    options.innerWidth = 1000;
    options.itemsPerPage = 1000;
    options.x.ticks = 30;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }else if(options.outerWidth > 1250 && options.outerWidth <=1500){
    options.innerWidth = 1250;
    options.itemsPerPage = 1250;
    options.x.ticks = 35;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }else{
    options.innerWidth = 1500;
    options.itemsPerPage = 1500;
    options.x.ticks = 40;
    let margin = (options.outerWidth - options.innerWidth)/2;
    options.innerMargin.left = margin > options.largeGridSize
     ? margin - (margin%options.largeGridSize)
     : options.largeGridSize;
    options.innerMargin.right = options.innerMargin.left;
  }

  return options;
}
