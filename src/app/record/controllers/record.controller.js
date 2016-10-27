export class RecordController {
  constructor ($http, $auth, API_URL) {
      'ngInject';

      this.$http = $http;
      this.$auth = $auth;
      this.API_URL = API_URL;
      this.currentPage = 1;
      this.maxSize = 5;
      this.itemsPerPage = 100;
      this.pageContent = [];
      
      if(!this.$auth.isAuthenticated())
          this.$state.go('home');
      
      this.getRecords();
  }

    getRecords(){
        var vm = this;
        this.$http.get(this.API_URL+'api/records').then(function(result){
            vm.records = result.data;
            vm.totalItems = vm.records.length;
            vm.numPages = Math.floor(vm.totalItems/vm.itemsPerPage);
            if(vm.totalItems % vm.itemsPerPage > 0)
                vm.numPages++;
            
            vm.getPageContent();
            
        });
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

    timeConverter(ts, format){
        var a = new Date(ts);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
        var year = a.getFullYear();
        var month_num = a.getMonth()+1;
        var month = months[(month_num -1)];
        var date = a.getDate();
        if(date < 10)
            date = '0'+date;
        var day = days[a.getDay()];
        var hour = a.getHours();
        if(hour < 10)
            hour = '0'+hour;
        var min = a.getMinutes();
        if(min < 10)
            min = '0'+min;
        var sec = a.getSeconds();
        if(sec < 10)
            sec = '0'+sec;
        
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
