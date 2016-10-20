export class PatientController {
  constructor ($http, API_URL, $state, $auth) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.$auth = $auth;
      this.API_URL = API_URL;
      
      if(!this.$auth.isAuthenticated())
          this.$state.go('home');
      
      this.getPatients();
  }

    getPatients(){
        var vm = this;
        this.$http.get(this.API_URL+'api/patients').then(function(result){
            vm.patients = result.data;
            
            if(vm.patients.length > 0){
                var patient = {patientId: vm.patients[0].patientId};
                vm.$state.go('patient.record', patient);
            }
        });
    }
}
