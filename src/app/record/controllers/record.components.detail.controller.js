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
      
      this.display = 0;
      this.lastIndex = 0;
      
      if(!this.$auth.isAuthenticated())
          this.$state.go('home');
      
      this.getDetail();
      
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
                              "<tr>" + "<td class='key'>" + 'Location: ' + "</td>" +
                              "<td class='x-value'>" + e.value + "</td>" + 
                              "</tr>";
                          var header = 
                              "<thead>" + 
                              "<tr>" + 
                              "<td class='legend-color-guide'><div style='background-color: " + series.color + ";'></div></td>" + 
                              "<td class='key'><strong>" + 'PVC' + "</strong></td>" + 
                              "</tr>" + 
                              "</thead>";
                          return "<table>" + header + "<tbody>" + rows + "</tbody>" + "</table>";
                      }else{
                          series.tooltip = useVoronoi = false;
                      }
                  }
              },
              color: ['#ff0000'],
              x: function(d){ return d.x; },
              y: function(d){ return d.y; },
              xAxis: {
                  axisLabel: 'RR-Intervals (i = 0, 1,...n)',
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
  }

    getDetail(){
        var vm = this;
        vm._id = this.$state.params._id;
        this.$http.get(this.API_URL+'api/record-details?_id='+vm._id)
            .then(function(result){
            vm.detail = result.data;
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
                    vm.rr[0].values.push({x: i, y: sample});
                }
            }
            
            pvcLocs = vm.detail.pvcEvents.locs;

            vm.chOne = [{key:"chOne", values:[]}];
            vm.one = vm.detail.chOne;
            vm.chTwo = [{key:"chTwo", values:[]}];
            vm.two = vm.detail.chTwo;
            vm.chThree = [{key:"chThree", values:[]}];
            vm.three = vm.detail.chThree;
            
            vm.populateData();
            
        });
    }
    
    onReady(scope, el){
        chart = scope.chart;
    }

    populateData(){
        if(this.lastIndex == this.one.length)
            this.lastIndex = 0;
        var rem = this.one.length - this.lastIndex;
        var len = (rem < 1000)? rem : 1000;
        len += this.lastIndex;
        var x1 = [], x2 = [], x3 = [];
        
        for(var i=this.lastIndex; i<len; i++){
            if(this.one[i] == this.NAN){
                x1.push({x: i*4, y: parseInt(NaN)});
                x2.push({x: i*4, y: parseInt(NaN)});
                x3.push({x: i*4, y: parseInt(NaN)});
            }else{
                x1.push({x: i*4, y: parseInt(this.one[i])});
                x2.push({x: i*4, y: parseInt(this.two[i])});
                x3.push({x: i*4, y: parseInt(this.three[i])});
            }
            this.lastIndex++;
        }
        this.chOne[0].values = x1;
        this.chTwo[0].values = x2;
        this.chThree[0].values = x3;
    }
    
    setDisplay(option){
        this.display = option;
    }
    
    isECG(){
        var str = vm.detail.type;
        return (str.toUpperCase().indexOf("ECG") >= 0);
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