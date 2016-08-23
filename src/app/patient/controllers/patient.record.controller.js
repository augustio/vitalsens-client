export class PatientRecordController {
  constructor ($http, $state) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.getPatientRecords();
  }

    getPatientRecords(){
        var vm = this;
        var pId = this.$state.params.patientId;
        this.$http.get('http://localhost:5000/api/records?patientId='+pId).then(function(result){
            vm.records = result.data;
        });
    }
}