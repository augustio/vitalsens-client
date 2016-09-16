export class RecordComponentsDetailController {
  constructor ($http, $state, API_URL, $interval) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.$interval = $interval;
      this.showOne = true;
      this.showTwo = true;
      this.showThree = true;
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
            if(vm.detail.rrIntervals && vm.detail.rPeaks && vm.detail.hrvFeatures){
                vm.rr = [{key:"HRV", values:[]}];
                for(var i=0, j=1; i<vm.detail.rrIntervals.signal.length; i++, j++){
                    vm.rr[0].values.push({x: vm.detail.rPeaks.locT[j], y: vm.detail.rrIntervals.signal[i]});
                }
            }
            
            vm.chOne = [{key:"chOne", values:[]}];
            vm.one = vm.detail.chOne;
            vm.chTwo = [{key:"chTwo", values:[]}];
            vm.two = vm.detail.chTwo;
            vm.chThree = [{key:"chThree", values:[]}];
            vm.three = vm.detail.chThree;
            
            vm.displayChannel(3);
            vm.displayChannel(2);
            vm.displayChannel(1);
            
        });
    }
    
    displayChannel(channel){
        switch(channel){
            case 1:
                this.showOne = true;
                this.showTwo = false;
                this.showThree = false;
                if(this.chOne[0].values.length < this.one.length ){
                    for(var k=0; k<this.one.length; k++){
                        this.chOne[0].values.push({x: k*4, y: parseInt(this.one[k])});
                    }
                }
                break;
            case 2:
                this.showOne = false;
                this.showTwo = true;
                this.showThree = false;
                if(this.chTwo[0].values.length < this.two.length ){
                    for(var l=0; l<this.two.length; l++){
                        this.chTwo[0].values.push({x: l*4, y: parseInt(this.two[l])});
                    }
                }
                break;
            case 3:
                this.showThree = true;
                this.showOne = false;
                this.showTwo = false;
                if(this.chThree[0].values.length < this.three.length ){
                    for(var m=0; m<this.three.length; m++){
                        this.chThree[0].values.push({x: m*4, y: parseInt(this.three[m])});
                    }
                }
                break;
        }
    }
    
    formatValue(value){
        if(typeof value == "number"){
            return value.toFixed(3);
        } 
        return value;
    }
}