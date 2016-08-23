export class PatientController {
  constructor ($http) {
      'ngInject';

      this.$http = $http;
      this.getPatients();
  }

    getPatients(){
        var vm = this;
        this.$http.get('http://localhost:5000/api/patients').then(function(result){
            vm.patients = result.data;
        });
    }
}
