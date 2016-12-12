export class PatientRecordController {
  constructor ($http, $state, $auth, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.$auth = $auth;
      this.API_URL = API_URL;
      this.currentPage = 1;
      this.maxSize = 5;
      this.itemsPerPage = 40;
      this.pageContent = [];
      
      if(!this.$auth.isAuthenticated())
          this.$state.go('home');
      
      this.getPatientRecords();
  }

    getPatientRecords(){
        var vm = this;
        vm.pId = this.$state.params.patientId;
        if(vm.pId != null){
            this.$http.get(this.API_URL+'api/records?patientId='+vm.pId).then(function(result){
                vm.records = result.data;

                vm.totalItems = vm.records.length;
                vm.numPages = Math.floor(vm.totalItems/vm.itemsPerPage);
                if(vm.totalItems % vm.itemsPerPage > 0)
                    vm.numPages++;
            
                vm.getPageContent();
                });
            }
    }
    
    getPageContent(){
        var start = (this.currentPage - 1) * this.itemsPerPage;
        var end = start + this.itemsPerPage;
        if(this.currentPage == this.numPages){
            this.pageContent = this.records.slice(start);
        }else{
            this.pageContent = this.records.slice(start, end);
        }
    }
}