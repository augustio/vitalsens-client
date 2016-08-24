export class PatientController {
  constructor ($http, API_URL) {
      'ngInject';

      this.$http = $http;
      this.API_URL = API_URL;
      this.getPatients();
  }

    getPatients(){
        var vm = this;
        this.$http.get('http://'+this.API_URL+':5000/api/patients').then(function(result){
            vm.patients = result.data;
        });
    }
}
