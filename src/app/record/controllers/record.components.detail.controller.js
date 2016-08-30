export class RecordComponentsDetailController {
  constructor ($http, $state, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.getDetail();
      
      this.rrOptions = {
          chart: {
              type: 'lineChart',
              height: 200,
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
              type: 'lineChart',
              height: 200,
              useInteractiveGuideline: true,
              color: ['#0000ff'],
              x: function(d){ return d.x; },
              y: function(d){ return d.y; },
              xAxis: {
                  axisLabel: 'Time(ms)'
              },
              yAxis: {
                  axisLabel: 'Voltage(mv)'
              },
              transitionDuration: 500
          }
      }
  }

    getDetail(){
        var vm = this;
        vm._id = this.$state.params._id;
        this.$http.get(this.API_URL+'api/record-details?_id='+vm._id)
            .then(function(result){
            vm.detail = result.data;
            vm.rr = [{key:"HRV", values:[]}];
            for(var i=0, j=1; i<vm.detail.rrIntervals.signal.length; i++, j++){
                vm.rr[0].values.push({x: vm.detail.rPeaks.locT[j], y: vm.detail.rrIntervals.signal[i]});
            }
            vm.chOne = [{key:"chOne", values:[]}];
            vm.one = vm.detail.chOne;
            for(var k=0; k<vm.one.length; k++){
                vm.chOne[0].values.push({x: k*4, y: parseInt(vm.one[k])});
            }
            vm.chTwo = [{key:"chTwo", values:[]}];
            vm.two = vm.detail.chTwo;
            for(var l=0; l<vm.two.length; l++){
                vm.chTwo[0].values.push({x: l*4, y: parseInt(vm.two[l])});
            }
            vm.chThree = [{key:"chThree", values:[]}];
            vm.three = vm.detail.chThree;
            for(var m=0; m<vm.three.length; m++){
                vm.chThree[0].values.push({x: m*4, y: parseInt(vm.three[m])});
            }
        });
    }
    
    formatValue(value){
        if(typeof value == "number"){
            return value.toFixed(3);
        } 
        return value;
    }
    
}