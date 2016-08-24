export class RecordDetailController {
  constructor ($http, $state, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.getRecordDetail();
  }

    getRecordDetail(){
        var vm = this;
        var tStamp = this.$state.params.timeStamp;
        var pId = this.$state.params.patientId;
        var tp = this.$state.params.type;
        this.$http.get('http://'+this.API_URL+'api/record-details?timeStamp='+tStamp+'&patientId='+pId+'&type='+tp).then(function(result){
            vm.detail = result.data;
        });
    }
}