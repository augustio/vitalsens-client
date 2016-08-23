export class RecordController {
  constructor ($http) {
      'ngInject';

      this.$http = $http;
      this.getRecords();
  }

    getRecords(){
        var vm = this;
        this.$http.get('http://localhost:5000/api/records').then(function(result){
            vm.records = result.data;
        });
    }
}
