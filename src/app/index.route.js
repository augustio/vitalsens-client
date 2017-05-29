export function routerConfig ($stateProvider, $urlRouterProvider) {
  'ngInject';
  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'app/main/main.html',
      controller: 'MainController',
      controllerAs: 'main'
    })
    .state('users-list', {
      url: '/users-list',
      templateUrl: 'app/user/views/users-list.html',
      controller: 'UserController',
      controllerAs: 'usr'
    })
    .state('user-detail', {
      url: '/user-detail',
      params:{userId: null},
      templateUrl: 'app/user/views/user-detail.html',
      controller: 'UserController',
      controllerAs: 'usr'
    })
    .state('edit-user', {
      url: '/edit-user',
      params:{userId: null},
      templateUrl: 'app/user/views/edit-user.html',
      controller: 'UserController',
      controllerAs: 'usr'
    })
    .state('patient', {
      url: '/patient',
      templateUrl: 'app/patient/views/patient.html',
      controller: 'PatientController',
      controllerAs: 'patient'
    })
    .state('patient.record', {
      url: '/patient-record',
      params:{
          patientId: null
      },
      templateUrl: 'app/patient/views/patient.record.html',
      controller: 'PatientRecordController',
      controllerAs: 'pRecord'
    })
    .state('record', {
      url: '/record',
      templateUrl: 'app/record/views/record.html',
      controller: 'RecordController',
      controllerAs: 'record'
    })
    .state('record.raw', {
      url: '/record-raw',
      templateUrl: 'app/record/views/record-raw.html',
      controller: 'RecordRawController',
      controllerAs: 'raw'
    })
    .state('record.analysis', {
      url: '/record-analysis',
      templateUrl: 'app/record/views/record-analysis.html',
      controller: 'RecordAnalysisController',
      controllerAs: 'analysis'
    })
    .state('register', {
      url: '/register',
      templateUrl: 'app/user/views/register.html',
      controller: 'UserController',
      controllerAs: 'usr'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'app/auth/login.html',
      controller: 'AuthController',
      controllerAs: 'auth'
    });

  $urlRouterProvider.otherwise('/');
}
