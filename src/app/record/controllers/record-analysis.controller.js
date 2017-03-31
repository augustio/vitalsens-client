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

      /*this.rrOptions = {
          chart: {
              type: 'lineChart',
              height: 200,
              width: 1200,
              useInteractiveGuideline: false,
              tooltip: {
                  contentGenerator: function (e) {
                      var series = e.series[0];
                      if (isPVC(e.value)){
                          var rows =
                              "<tr>" + "<td class='key'>" + 'Loc: ' + "</td>" +
                              "<td class='x-value'>" + e.value + "</td>" +
                              "</tr>" +
                              "<tr>" + "<td class='key'>" + 'RR-Int: ' + "</td>" +
                              "<td class='x-value'>" + (series.value?series.value.toFixed(2):0) + "</td>" +
                              "</tr>";
                          var header =
                              "<thead>" +
                              "<tr>" +
                              "<td class='legend-color-guide'><div style='background-color: " + "#00ff00" + ";'></div></td>" +
                              "<td class='key'><strong>" + 'PVC' + "</strong></td>" +
                              "</tr>" +
                              "</thead>";
                          return "<table>" + header + "<tbody>" + rows + "</tbody>" + "</table>";
                      }else{
                          var rows =
                              "<tr>" + "<td class='key'>" + 'Loc: ' + "</td>" +
                              "<td class='x-value'>" + e.value + "</td>" +
                              "</tr>" +
                              "<tr>" + "<td class='key'>" + 'RR-Int: ' + "</td>" +
                              "<td class='x-value'>" + (series.value?series.value.toFixed(2):0) + "</td>" +
                              "</tr>";
                          var header =
                              "<thead>" +
                              "<tr>" +
                              "<td class='legend-color-guide'><div style='background-color: " + series.color + ";'></div></td>" +
                              "</tr>" +
                              "</thead>";
                          return "<table>" + header + "<tbody>" + rows + "</tbody>" + "</table>";
                      }
                  }
              },
              color: ['#ff0000'],
              x: function(d){ return d.x; },
              y: function(d){ return d.y; },
              xAxis: {
                  axisLabel: 'RR-Intervals (i = 1, 2,...n)',
                  axisLableDistance: 5
              },
              yAxis: {
                  axisLabel: 'Time (Seconds)',
                  tickFormat: function(d){
                      return d3.format('.02f')(d);
                  },
                  axisLableDistance: 5
              },
              forceY: [0, 1.5],
              callback: highlightPoints,
              dispatch: {
                  renderEnd: function(){
                      highlightPoints(chart )
                  }
              }
          }
      };*/

      /*this.poincareOptions = {
          chart: {
              type: 'scatterChart',
              height: 350,
              useVoronoi: false,
              duration: 250,
              pointSize: 3,
              pointDomain: [0, 5],
              xAxis: {
                  axisLabel: 'RR (i)',
                  tickFormat: function(d){
                      return d3.format('.02f')(d);
                  }
              },
              forceX: [-2, 0, 2],
              forceY: [-2, 0, 2],
              yAxis: {
                  axisLabel: 'RR (i+1)',
                  tickFormat: function(d){
                      return d3.format('.02f')(d);
                  }
              },
              zoom: {
                  //NOTE: All attributes below are optional
                  enabled: true,
                  scaleExtent: [1, 10],
                  useFixedDomain: false,
                  useNiceScale: false,
                  horizontalOff: false,
                  verticalOff: false,
                  unzoomEventType: 'dblclick.zoom'
              }
          }
      };*/

      //this.getDetail();
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
  };
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
      .attr('cx',(d,i) => x(d.x))
      .attr('cy',(d,i) => y(d.y))
      .attr('r','5')
      .attr('fill', 'blue');

    const d = [
      ...data.pData,
      ...data.pvc
    ];
    chartGroup.selectAll('circle')
      .data(d)
      .enter().append('circle')
      .attr('cx',(d,i) => x(d.x))
      .attr('cy',(d,i) => y(d.y))
      .attr('r','5')
      .attr('fill', 'red');
  }

  clearChart(){
    if(d3.select('#poincare-chart').select('svg')){
      d3.select('#poincare-chart').select('svg').remove();
    }
  }
}

const isPVC = value => {
  for(var i = 0; i < pvcLocs.length; i++){
    if(value == pvcLocs[i]){
      return true;
    }
  }
  return false;
}

    /*getDetail(){
        var vm = this;
        vm._id = this.$state.params._id;
        if(vm._id != null){
            this.$http.get(this.API_URL+'api/record-details?_id='+vm._id)
                .then(function(result){
                vm.detail = result.data;
                vm.dataType = vm.detail.type;
                vm.start = vm.detail.pEStart;
                vm.end = vm.detail.pEEnd;
                vm.marked = Array(vm.detail.chOne.length).fill(null);
                if(vm.start > -1 || vm.end > -1){
                    if(vm.start == -1)
                        vm.start = 0;
                    if(vm.end == -1)
                        vm.end = vm.detail.chOne.length;

                    vm.marked = [
                      ...vm.marked.slice(0, vm.start),
                      ...vm.detail.chOne.slice(vm.start, vm.end),
                      ...vm.marked.slice(vm.end)
                    ];
                }
                if(vm.detail.type.toUpperCase().indexOf("ECG") >= 0){
                    if(vm.detail.rrIntervals && vm.detail.rPeaks && vm.detail.hrvFeatures){
                        vm.rr = [{key:"RR Series", values:[]}];
                        vm.poincare = [{key:"Poincare", values:[]}];
                        var xValue;
                        for(var i=0, j=1; i<vm.detail.rrIntervals.signal.length; i++, j++){
                            var sample = vm.detail.rrIntervals.signal[i];
                            if((i % 2) == 0){
                                xValue = sample;
                            }else{
                                vm.poincare[0].values.push({x: xValue, y: sample});
                            }
                            vm.rr[0].values.push({x: i+1, y: sample});
                        }
                        pvcLocs = vm.detail.pvcEvents.locs;
                    }
                }

                vm.one = vm.detail.chOne;
                vm.two = vm.detail.chTwo;
                vm.three = vm.detail.chThree;

                vm.isECG = (vm.detail.type.toUpperCase().indexOf("ECG") >= 0);

                vm.totalItems = vm.one.length;
                vm.numPages = Math.ceil(vm.totalItems/vm.itemsPerPage);

                vm.populateData();

            });
        }else{
            vm.$state.go('patient');
        }
    }

    onReady(scope, el){
        chart = scope.chart;
    }

    populateData(){
        var index = (this.currentPage - 1) * this.itemsPerPage;
        var len;
        if(this.currentPage == this.numPages && this.one.length != this.itemsPerPage)
            len = this.one.length % this.itemsPerPage;
        else
            len = this.itemsPerPage;
        len += index;

        var durationPerSample = 1/this.samplingRate; //In seconds
        var chOneArr = this.one.slice(index, len);
        var markedArr = this.marked.slice(index, len);
        var chTwoArr = this.two.slice(index, len);
        var chThreeArr = this.three.slice(index, len);
        var chOneData = chOneArr.map((e, i) =>{
            return {
                x: i*durationPerSample,
                y: (e == null) ? e : (chThreeArr[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
        });
        var markedData = markedArr.map((e, i) =>{
            return {
                x: i*durationPerSample,
                y: (e == null) ? e : (chThreeArr[i] - e) *this.ADC_TO_MV_COEFFICIENT
            };
        });
        var chTwoData = chTwoArr.map((e, i) => {
          return {
              x: i*durationPerSample,
              y: (e == null) ? e : (chOneArr[i] - e) *this.ADC_TO_MV_COEFFICIENT
          };
        });
        var chThreeData = chThreeArr.map((e, i) => {
          return {
              x: i*durationPerSample,
              y: (e == null) ? e : (chOneArr[i] - e) *this.ADC_TO_MV_COEFFICIENT
          };
        });

        Chart.defaults.global.tooltips.enabled = false;


        var canvas1 = document.getElementById("channel-1");
        var ctx1 = canvas1.getContext('2d');
        var canvas2 = document.getElementById("channel-2");
        var ctx2 = canvas2.getContext('2d');
        var canvas3 = document.getElementById("channel-3");
        var ctx3 = canvas3.getContext('2d');

        var datasetsConfig = {
            label: "",
            data: [],
            fill: false,
            lineTension: 0,
            backgroundColor: "rgb(0,0,255)",
            borderWidth: 1,
            borderColor: "rgb(0,0,255)",
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgb(0,0,255)",
            pointBackgroundColor: "rgb(0,0,255)",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgb(255, 204, 204)",
            pointHoverBorderColor: "rgb(0,0,255)",
            pointHoverBorderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            spanGaps: false
        };

        var markedDataSet =
        {
            label: "",
            data: markedData,
            fill: false,
            lineTension: 0,
            backgroundColor: "rgb(255,0,0)",
            borderWidth: 3,
            borderColor: "rgb(255,0,0)",
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderJoinStyle: 'miter',
            pointBorderColor: "rgb(255,0,0)",
            pointBackgroundColor: "rgb(255,0,0)",
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: "rgb(255, 204, 204)",
            pointHoverBorderColor: "rgb(255,0,0)",
            pointHoverBorderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            spanGaps: false
        };

        var chOneDataSet = Object.assign({}, datasetsConfig, {label: "CH I", data: chOneData});
        var chTwoDataSet = Object.assign({}, datasetsConfig, {label: "CH II", data: chTwoData});
        var chThreeDataSet = Object.assign({}, datasetsConfig, {label: "CH III", data: chThreeData});

        var data1 = {
            datasets: [
                chOneDataSet,
                markedDataSet
            ]
        };
        var data2 = {
            datasets: [
                chTwoDataSet
            ]
        };
        var data3 = {
            datasets: [
                chThreeDataSet
            ]
        };

        var opt = {
            hover: {
                intersect: false,
                onHover: null
            },
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Amplitude(mV)",
                        fontColor: "rgb(0, 0, 255)"
                    },
                    ticks: {
                        beginAtZero:false
                    },
                    gridLines: {
                        color: "rgb(255, 150, 150)"
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Time(Seconds)",
                        fontColor: "rgb(0, 0, 255)"
                    },
                    ticks: {
                        beginAtZero:false,
                        autoSkip: false,
                        stepSize: 0.2
                    },
                    gridLines: {
                        color: "rgb(255, 150, 150)"
                    },
                    type: 'linear',
                    position: 'bottom'
                }]
            },
            legend: {
                display: true,
                labels: {
                    fontColor: 'rgb(0,0,0)',
                    boxWidth: 0
                }
            }
        }

        if(this.chartOne != undefined)
            this.chartOne.destroy();
        if(this.chartTwo != undefined)
            this.chartTwo.destroy();
        if(this.chartThree != undefined)
            this.chartThree.destroy();


        this.chartOne = new Chart(ctx1, {
            type: 'line',
            data: data1,
            options: opt
        });
        this.chartTwo = new Chart(ctx2, {
            type: 'line',
            data: data2,
            options: opt
        });
        this.chartThree = new Chart(ctx3, {
            type: 'line',
            data: data3,
            options: opt
        });
    }

    setDisplay(option){
        this.display = option;
    }

    formatValue(value){
        if(typeof value == "number"){
            return value.toFixed(3);
        }
        return value;
    }

    saveChart(){
        var chart = document.getElementById("print-chart-context");
        var ctx = chart.getContext("2d");
        var img1 = document.getElementById("channel-1");
        var img2 = document.getElementById("channel-2");
        var img3 = document.getElementById("channel-3");
        ctx.drawImage(img1,0,0);
        ctx.drawImage(img2,0,300);
        ctx.drawImage(img3,0,600);
        chart.toBlob(function(blob){
            saveAs(blob, "ECG_Chart.png");
        });
    }
}

var chart;
var pvcLocs;

function isPVC(value){
    for(var i = 0; i < pvcLocs.length; i++){
        if(value == pvcLocs[i])
            return true;
    }
    return false;
}

function highlightPoints(ch){
    var data = d3.select('.rrInt')
                .select('svg').datum();

    d3.select('.nv-groups')
        .selectAll("circle.pvc")
        .remove();

    var points = d3.select('.nv-groups')
        .selectAll("circle.pvc")
        .data(data[0].values.filter(function(d) {
            return isPVC(d.x);
        }));

    points.enter().append("circle")
        .attr("class", "pvc")
        .attr("cx", function(d) { return ch.xAxis.scale()(d.x); })
        .attr("cy", function(d) { return ch.yAxis.scale()(d.y); })
        .attr("r", 5);
}*/
