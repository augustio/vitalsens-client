export class PatientRecordController {
  constructor ($http, $state, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.getPatientRecords();
  }

    getPatientRecords(){
        var vm = this;
        var pId = this.$state.params.patientId;
        this.$http.get('http://'+this.API_URL+':5000/api/records?patientId='+pId).then(function(result){
            vm.records = result.data;
        });
    }
}