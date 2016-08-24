export class RecordController {
  constructor ($http, API_URL) {
      'ngInject';

      this.$http = $http;
      this.API_URL = API_URL;
      this.getRecords();
  }

    getRecords(){
        var vm = this;
        this.$http.get(this.API_URL+'api/records').then(function(result){
            vm.records = result.data;
        });
    }
}
