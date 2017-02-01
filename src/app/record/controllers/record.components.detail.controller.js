export class RecordComponentsDetailController {
  constructor ($http, $state, API_URL, $interval, $scope, $auth) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.$interval = $interval;
      this.$scope = $scope;
      this.$auth = $auth;
      this.NAN = -4096;
      this.ECG_3 = "Three Channels ECG";
      this.currentPage = 1;
      this.maxSize = 5;
      this.itemsPerPage = 2000;
      this.samplingRate = 250;
      this.ADC_TO_MV_COEFFICIENT = 0.01465;
      this.yStepSize = 0.5;

      this.display = 0;

      if(!this.$auth.isAuthenticated())
          this.$state.go('home');

      this.rrOptions = {
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
      };

      this.poincareOptions = {
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
      };

      this.ecgOptions = {
          chart: {
              type: 'lineChart',
              height: 200,
              useInteractiveGuideline: false,
              tooltip: {
                  contentGenerator: function (e) {
                      var series = e.series[0];
                      var rows =
                              "<tr>" + "<td class='key'>" + 'T: ' + "</td>" +
                              "<td class='x-value'>" + e.value + "</td>" +
                              "</tr>" +
                              "<tr>" + "<td class='key'>" + 'V: ' + "</td>" +
                              "<td class='x-value'>" + series.value + "</td>" +
                          "</tr>";
                          return "<table style='background-color: " + series.color + "; color: #ffffff;'>" + "<tbody>" + rows + "</tbody>" + "</table>";
                  }
              },
              color: ['#0000ff'],
              x: function(d){ return d.x; },
              y: function(d){ return d.y; },
              xAxis: {
                  axisLabel: 'Time(ms)'
              },
              yAxis: {
                  axisLabel: 'Voltage(mv)'
              }
          }
      };
      this.getDetail();
  }

    getDetail(){
        var vm = this;
        vm._id = this.$state.params._id;
        if(vm._id != null){
            this.$http.get(this.API_URL+'api/record-details?_id='+vm._id)
                .then(function(result){
                vm.detail = result.data;
                var start = vm.detail.pEStart;
                var end = vm.detail.pEEnd;
                if(start > -1 || end > -1){
                    if(start == -1)
                        start = 0;
                    if(end == -1)
                        end = vm.detail.chOne.length;
                    vm.detail.chOne = vm.detail.chOne.slice(start, end);
                    vm.detail.chTwo = vm.detail.chTwo.slice(start, end);
                    vm.detail.chThree = vm.detail.chThree.slice(start, end);

                    vm.ecgOptions.chart.color = ['#ff0000'];
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
                else {
                  vm.yStepSize = 1;
                }

                vm.chOne = [{key:"chOne", values:[]}];
                vm.one = vm.detail.chOne;
                vm.chTwo = [{key:"chTwo", values:[]}];
                vm.two = vm.detail.chTwo;
                vm.chThree = [{key:"chThree", values:[]}];
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
        var chTwoArr = this.two.slice(index, len);
        var chThreeArr = this.three.slice(index, len);
        var chOneData = chOneArr.map((e, i) =>{
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

        var c1 = document.getElementById("channel-1");
        var c2 = document.getElementById("channel-2");
        var c3 = document.getElementById("channel-3");

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

        var chOneDataSet = JSON.parse(JSON.stringify(datasetsConfig));
        chOneDataSet.label = "CH I";
        chOneDataSet.data = chTwoData;
        var chTwoDataSet = JSON.parse(JSON.stringify(datasetsConfig));
        chTwoDataSet.label = "CH II";
        chTwoDataSet.data = chTwoData;
        var chThreeDataSet = JSON.parse(JSON.stringify(datasetsConfig));
        chThreeDataSet.label = "CH III";
        chThreeDataSet.data = chThreeData;
        var data1 = {
            datasets: [
                chOneDataSet
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
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Amplitude(mV)",
                        fontColor: "rgb(0, 0, 255)"
                    },
                    ticks: {
                        beginAtZero:false,
                        autoSkip: true,
                        stepSize: this.yStepSize
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
                        autoSkip: true,
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

        var chartOne = new Chart(c1, {
            type: 'line',
            data: data1,
            options: opt
        });
        var chartTwo = new Chart(c2, {
            type: 'line',
            data: data2,
            options: opt
        });
        var chartThree = new Chart(c3, {
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

    toggleAnimation(){
        this.animate = !this.animate;
    }

    saveChart(){
        chart = document.getElementById("print-chart-context");
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
}
