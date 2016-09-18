export class RecordComponentsDetailController {
  constructor ($http, $state, API_URL, $interval) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.$interval = $interval;
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
            
            vm.chOneA = [{key:"chOneA", values:[]}];
            vm.chOneB = [{key:"chOneB", values:[]}];
            vm.one = vm.detail.chOne;
            vm.chTwoA = [{key:"chTwoA", values:[]}];
            vm.chTwoB = [{key:"chTwoB", values:[]}];
            vm.two = vm.detail.chTwo;
            vm.chThreeA = [{key:"chThreeA", values:[]}];
            vm.chThreeB = [{key:"chThreeB", values:[]}];
            vm.three = vm.detail.chThree;
            
            vm.populateData();
            vm.nextDisplay(1);
            
        });
    }
    
    populateData(){
        var len = this.one.length;
        if(this.two.length <= len)
            len = this.two.length;
        if(this.three.length <= len)
            len = this.three.length;
        
        for(var k=0; k<len; k++){
            if(k < len/2){
                this.chOneA[0].values.push({x: k*4, y: parseInt(this.one[k])});
                this.chTwoA[0].values.push({x: k*4, y: parseInt(this.two[k])});
                this.chThreeA[0].values.push({x: k*4, y: parseInt(this.three[k])});
            }else{
                this.chOneB[0].values.push({x: k*4, y: parseInt(this.one[k])});
                this.chTwoB[0].values.push({x: k*4, y: parseInt(this.two[k])});
                this.chThreeB[0].values.push({x: k*4, y: parseInt(this.three[k])});
            } 
        }
    }
    
    nextDisplay(next){
        if(next == 1){
            this.chOne = this.chOneA;
            this.chTwo = this.chTwoA;
            this.chThree = this.chThreeA;
        }else{
            this.chOne = this.chOneB;
            this.chTwo = this.chTwoB;
            this.chThree = this.chThreeB;
        }
    }
    
    formatValue(value){
        if(typeof value == "number"){
            return value.toFixed(3);
        } 
        return value;
    }
}