export class RecordComponentsController {
  constructor ($http, $state, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$state = $state;
      this.API_URL = API_URL;
      this.getRecordComponents();
  }

    getRecordComponents(){
        var vm = this;
        vm.timeStamp = this.$state.params.timeStamp;
        vm.patientId = this.$state.params.patientId;
        vm.type = this.$state.params.type;
        this.$http.get(this.API_URL+'api/record-details?timeStamp='+vm.timeStamp+'&patientId='+vm.patientId+'&type='+vm.type)
            .then(function(result){
            vm.components = result.data;
        });
    }
    
    timeConverter(ts, format){
        var a = new Date(ts);
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
        
        var res = "";
        
        switch (format){
            case 1:
                res =  day + ", " + date + "." + month_num + "." + year + " " + hour + ":" + min + ":" + sec;
                break;
            case 2:
                res =  date + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
                break;
            case 3:
                res =  hour + ":" + min + ":" + sec;
                break;
        }
        
        return res;
    }
}