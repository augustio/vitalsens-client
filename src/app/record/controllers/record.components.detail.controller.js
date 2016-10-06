export class RecordComponentsDetailController {
  constructor ($http, $state, API_URL, $interval, $scope) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.$interval = $interval;
      this.$scope = $scope;
      
      this.display = 0;
      this.lastIndex = 0;
      
      this.getDetail();
      
      this.rrOptions = {
          chart: {
              type: 'lineChart',
              height: 200,
              useVoronoi: false,
              useInteractiveGuideline: true,
              color: ['#ff0000'],
              x: function(d){ return d.x; },
              y: function(d){ return d.y; },
              xAxis: {
                  axisLabel: 'Time'
              },
              yAxis: {
                  axisLabel: 'RR-Intervals'
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
                vm.rr = [{key:"HRV", values:[]}];
                for(var i=0, j=1; i<vm.detail.rrIntervals.signal.length; i++, j++){
                    vm.rr[0].values.push({x: i, y: vm.detail.rrIntervals.signal[i]});
                }
            }
            
            vm.chOne = [{key:"chOne", values:[]}];
            vm.one = vm.detail.chOne;
            vm.chTwo = [{key:"chTwo", values:[]}];
            vm.two = vm.detail.chTwo;
            vm.chThree = [{key:"chThree", values:[]}];
            vm.three = vm.detail.chThree;
            
            vm.populateData();
            
        });
    }
    
    populateData(){
        if(this.lastIndex == this.one.length)
            this.lastIndex = 0;
        var rem = this.one.length - this.lastIndex;
        var len = (rem < 1000)? rem : 1000;
        len += this.lastIndex;
        var x1 = [], x2 = [], x3 = [];
        
        for(var i=this.lastIndex; i<len; i++){
            x1.push({x: i*4, y: parseInt(this.one[i])});
            x2.push({x: i*4, y: parseInt(this.two[i])});
            x3.push({x: i*4, y: parseInt(this.three[i])});
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