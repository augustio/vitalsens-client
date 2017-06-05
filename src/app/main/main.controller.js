export class MainController {
  constructor($auth, $state, $http, $window, API_URL){
    'ngInject';

    this.$auth = $auth;
    this.$state = $state;

    if(!this.$auth.isAuthenticated()){
      this.$state.go('login');
      return;
    }

    this.$http = $http;
    this.$window = $window;
    this.API_URL = API_URL;

    this.filters = {
      dateFrom: new Date(),
      dateTo: new Date()
    };
    this.selectedPatient = null;

    this.formats = [
      'M!/d!/yyyy',
      'dd-MMMM-yyyy',
      'yyyy/MM/dd',
      'dd.MM.yyyy',
      'shortDate'
    ];
    this.dateOptions = {
      maxDate: new Date(2030, 12, 31),
      minDate: new Date(2016, 1, 1),
      startingDay: 1
    };
    this.format = this.formats[3];
    this.fromOpened = false;
    this.toOpened = false;

    this.getPatients();
  }

  getAuthUser(){
    let authUser = {}
    let payload = this.$auth.getPayload();
    if(payload) { authUser = payload.user || {}; }
    return authUser;
  }

  getPatients(){
    this.$http.get(this.API_URL+'api/users/patients')
      .then(successRes => {
        this.patients = successRes.data.users;
        let id = this.$state.params.patientId;
        if(id){ this.getPatientRecords(id); }
      });
  }

  getPatientRecords(patientId){
    let id = '';
    if(this.selectedPatient) { id = this.selectedPatient.userId; }
    else if(patientId){
      id = patientId;
      this.selectedPatient = this.patients.find(p => p.userId == patientId);
    }
    if(id == null) {return;}
    this.$http.get(this.API_URL+'api/records/user/'+id)
      .then(successRes => {
        this.records = successRes.data || [];
        this.filteredRecords = this.records;
      });
  }

  deleteRecord(e, record_id){
    if(!e) { e = this.$window.event; }
    if(e.stopPropagation){ e.stopPropagation(); }
    else { e.cancelBubble = true; }
    this.$http.delete(this.API_URL+'api/records/'+record_id)
      .then(() => {
        this.getPatientRecords(this.selectedPatient.userId);
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

  clear() {
    this.selectedDate = null;
  }
  openFrom() {
    this.fromOpened = true;
  }
  openTo(){
    this.toOpened = true;
  }
  setDate(year, month, day) {
    this.selectedDate = new Date(year, month, day);
  }
}
