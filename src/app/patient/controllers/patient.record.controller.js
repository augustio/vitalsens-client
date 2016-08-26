export class PatientRecordController {
  constructor ($http, $state, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.getPatientRecords();
  }

    getPatientRecords(){
        var vm = this;
        var pId = this.$state.params.patientId;
        this.$http.get(this.API_URL+'api/records?patientId='+pId).then(function(result){
            vm.records = result.data;
        });
    }
    
    timeConverter(timestamp, format){
        var a = new Date(timestamp);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
        var year = a.getFullYear();
        var month_num = a.getMonth()+1;
        var month = months[(month_num -1)];
        var date = a.getDate();
        var day = days[a.getDay()];
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        
        switch (format){
            case 1:
                return day + ", " + date + "." + month_num + "." + year + " " + hour + ":" + min + ":" + sec;
                break;
            case 2:
                return date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
                break;
            case 3:
                return hour + ":" + min + ":" + sec;
                break;
            default:
                return "";
        }
    }
}