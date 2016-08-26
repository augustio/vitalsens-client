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
