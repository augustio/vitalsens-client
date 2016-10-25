export class RecordComponentsController {
  constructor ($http, $state, $auth, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.$auth = $auth;
      this.API_URL = API_URL;
      
      if(!this.$auth.isAuthenticated())
          this.$state.go('home');
      
      this.getRecordComponents();
  }

    getRecordComponents(){
        var vm = this;
        vm.timeStamp = this.$state.params.timeStamp;
        vm.patientId = this.$state.params.patientId;
        vm.type = this.$state.params.type;
        if(vm.timeStamp != null && vm.patientId != null && vm.type != null){
            this.$http.get(this.API_URL+'api/record-details?timeStamp='+vm.timeStamp+'&patientId='+vm.patientId+'&type='+vm.type)
                .then(function(result){
                vm.components = result.data;
                if(vm.components.length > 0){
                    var index = vm.components.length - 1;
                    var comp = {_id: vm.components[index]._id};
                    vm.$state.go('record-components.detail', comp);
                }
            });
        }
    }
    
    timeConverter(ts, format){
        var a = new Date(ts);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
        var year = a.getFullYear();
        var month_num = a.getMonth()+1;
        var month = months[(month_num -1)];
        var date = a.getDate();
        var day = days[a.getDay()];
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        
        var res = "";
        
        switch (format){
            case 1:
                res =  day + ", " + date + "." + month_num + "." + year + " " + hour + ":" + min + ":" + sec;
                break;
            case 2:
                res =  date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
                break;
            case 3:
                res =  hour + ":" + min + ":" + sec;
                break;
            case 4:
                res = date + "_" + month + "_" + year + "_" + hour + "_" + min + "_" + sec;
                break;
        }
        
        return res;
    }
    
    getDuration(end, start){ 
        return Math.round((end - start) * 0.001);
    }

    downloadData(){
        var vm = this;
        vm.timeStamp = this.timeStamp;
        vm.patientId = this.patientId;
        vm.type = this.type;
        if(vm.timeStamp != null && vm.patientId != null && vm.type != null){
            this.$http.get(this.API_URL+'api/record-details?timeStamp='+vm.timeStamp+'&patientId='+vm.patientId+'&type='+vm.type+'&allFields='+"true")
                .then(function(result){
                var data = result.data;
                var len = data.length;
                vm.data = data[0];
                for(var i = 1; i < len; i++){
                    vm.data.chOne = vm.data.chOne.concat(data[i].chOne);
                    vm.data.chTwo = vm.data.chTwo.concat(data[i].chTwo);
                    vm.data.chThree = vm.data.chThree.concat(data[i].chThree);
                }
                vm.data.end = data[len-1].end;
                vm.data.rPeaks = data[len-1].rPeaks;
                vm.data.pvcEvents = data[len-1].pvcEvents;
                vm.data.rrIntervals = data[len-1].rrIntervals;
                vm.data.hrvFeatures = data[len-1].hrvFeatures;

                var zip = new JSZip();
                var fileName = vm.patientId+"_"+vm.timeConverter(vm.timeStamp, 4)+"_"+vm.type;
                zip.file(fileName+".txt", JSON.stringify(data));
                zip.generateAsync({type:"blob"})
                .then(function(content){
                    saveAs(content, fileName+".zip");
                });
            });
        }
    }
}