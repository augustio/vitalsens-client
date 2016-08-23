export class RecordDetailController {
  constructor ($http, $state) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.getRecordDetail();
  }

    getRecordDetail(){
        var vm = this;
        var tStamp = this.$state.params.timeStamp;
        var pId = this.$state.params.patientId;
        var tp = this.$state.params.type;
        this.$http.get('http://localhost:5000/api/record-details?timeStamp='+tStamp+'&patientId='+pId+'&type='+tp).then(function(result){
            vm.detail = result.data;
        });
    }
}