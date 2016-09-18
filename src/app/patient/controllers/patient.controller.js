export class PatientController {
  constructor ($http, API_URL, $state) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.getPatients();
  }

    getPatients(){
        var vm = this;
        this.$http.get(this.API_URL+'api/patients').then(function(result){
            vm.patients = result.data;
            
            var patient = {patientId: vm.patients[0].patientId};
            vm.$state.go('patient.record', patient);
        });
    }
}
