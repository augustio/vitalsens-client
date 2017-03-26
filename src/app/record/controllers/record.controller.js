export class RecordController {
  constructor ($http, $auth, $state, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$auth = $auth;
      this.$state = $state;
      this.API_URL = API_URL;
      this.currentPage = 1;
      this.maxSize = 5;
      this.itemsPerPage = 100;
      this.pageContent = [];

      if(!this.$auth.isAuthenticated())
          this.$state.go('home');

      this.showRawView();
  }
  showAnalysisView(){
    this.analysisSelected = {
      'background-color':'#224D91',
      'color':'white',
      'font-weight':'bold'
    };
    this.rawSelected = {};

    this.$state.go('record.analysis');
  }

  showRawView(){
    this.rawSelected = {
      'background-color':'#224D91',
      'color':'white',
      'font-weight':'bold'
    };
    this.analysisSelected = {};

    this.$state.go('record.raw');
  }
}
