export class AuthController{

    constructor($auth, $log, $state){
        'ngInject';

        this.$auth = $auth;
        this.$log = $log;
        this.$state = $state;
    }
    register(){
        var vm = this;
        this.$auth.signup(this.user).then(function(response){
            vm.$log.log(response);
            vm.$auth.setToken(response.data.token);
            vm.$state.go('home');
        }).catch(function(response){
            vm.$log.log(response);
        });
    }
    
    login(){
        var vm = this;
        this.$auth.login(this.login.user).then(function(response){
            vm.$log.log(response);
            vm.$auth.setToken(response.data.token);
            vm.$state.go('home');
        }).catch(function(response){
            vm.$log.log(response);
        });
    }
        
}
