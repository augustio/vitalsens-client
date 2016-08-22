export class RecordViewController {
  constructor ($http) {
      'ngInject';

      this.$http = $http;
      this.getRecordDetails();
  }

    getRecordDetails(){
        var vm = this;
        this.$http.get('http://localhost:5000/api/record-details').then(function(result){
            vm.recordDetails = result.data;
        });
    }
}