export class AuthController{

    constructor($auth, $state){
        'ngInject';

        this.$auth = $auth;
        this.$state = $state;
    }
    register(){
        var vm = this;
        this.$auth.signup(this.user).then(function(response){
            vm.$state.go('home');
        }).catch(function(response){
            vm.message = response.data.message;
        });
    }

    login(){
        var vm = this;
        this.$auth.login(this.login.user).then(function(response){
            vm.$auth.setToken(response.data.token);
            vm.$state.go('home');
        }).catch(function(response){
            vm.message = response.data.message;
        });
    }

}
