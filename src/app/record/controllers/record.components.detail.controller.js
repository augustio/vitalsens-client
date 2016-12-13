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
      
      this.display = 0;

      if(!this.$auth.isAuthenticated())
          this.$state.go('home');
      
      this.rrOptions = {
          chart: {
              type: 'lineChart',
              height: 200,
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
              type: 'lineWithFocusChart',
              height: 200,
              useVoronoi: false,
              useInteractiveGuideline: true,
              color: ['#0000ff'],
              x: function(d){ return d.x; },
              y: function(d){ return d.y; },
              xAxis: {
                  axisLabel: 'Time(ms)'
              },
              x2Axis: {
                  showMaxMin: false
              },
              yAxis: {
                  axisLabel: 'Voltage(mv)'
              },
              y2Axis: {},
              duration: 500
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
        var x1 = [], x2 = [], x3 = [];

        for(var i = index; i < len; i++){
            if(this.one[i] == this.NAN){
                x1.push({x: i*4, y: parseInt(NaN)});
                x2.push({x: i*4, y: parseInt(NaN)});
                x3.push({x: i*4, y: parseInt(NaN)});
            }else{
                x1.push({x: i*4, y: parseInt(this.one[i])});
                x2.push({x: i*4, y: parseInt(this.two[i])});
                x3.push({x: i*4, y: parseInt(this.three[i])});
            }
        }
        this.chOne[0].values = x1;
        this.chTwo[0].values = x2;
        this.chThree[0].values = x3;
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