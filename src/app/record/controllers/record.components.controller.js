export class RecordComponentsController {
  constructor ($http, $state, $auth, $filter, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.$auth = $auth;
      this.$filter = $filter;
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
    
    getDuration(end, start){ 
        return Math.round((end - start) * 0.001);
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
}