export class PatientController {
  constructor ($http, API_URL) {
      'ngInject';

      this.$http = $http;
      this.API_URL = API_URL;
      this.getPatients();
  }

    getPatients(){
        var vm = this;
        this.$http.get(this.API_URL+'api/patients').then(function(result){
            vm.patients = result.data;
        });
    }
}
