export class MainController {
  constructor($auth, $state, $http, API_URL){
    'ngInject';

    this.$auth = $auth;
    this.$state = $state;

    if(!this.$auth.isAuthenticated()){
      this.$state.go('login');
      return;
    }

    this.$http = $http;
    this.API_URL = API_URL;

    this.filters = {};
    this.selectedPatient = null;
    this.getPatients();
    this.getPatientRecords(this.$state.params.patientId);
  }

  getPatients(){
    this.$http.get(this.API_URL+'api/users/patients')
      .then(successRes => {
        this.patients = successRes.data.users;
      });
  }

  getPatientRecords(patientId){
    let id = patientId;
    if(this.selectedPatient) { id = this.selectedPatient.userId; }
    if(id == null) {return;}
    this.$http.get(this.API_URL+'api/records/user/'+id)
      .then(successRes => {
        this.records = successRes.data || [];
        this.filteredRecords = this.records;
      });
  }

  filterRecords(){
    this.filteredRecords = this.records;
    if(this.filters.type){
      this.filteredRecords = this.records.filter(r => r.type === this.filters.type);
    }
    if(this.filters.dateFrom){
      let from = moment(this.filters.dateFrom).unix()*1000;
      this.filteredRecords = this.filteredRecords.filter(r => {
        return r.recStart >= from;
      });
    }
    if(this.filters.dateTo){
      let to = moment(this.filters.dateTo).unix()*1000;
      this.filteredRecords = this.filteredRecords.filter(r => {
        return r.recStart <= to;
      });
    }
  }

  getDuration(from, to){
    if(to < from) { return 0; }
    return (to - from)/60000;
  }

  showRecord(r){
    this.$state.go('record', {record_id: r._id});
  }
}
