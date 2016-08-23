export function routerConfig ($stateProvider, $urlRouterProvider) {
  'ngInject';
  $stateProvider
    .state('home', {
      url: '/',
      templateUrl: 'app/main/main.html',
      controller: 'MainController',
      controllerAs: 'main'
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
    .state('record-detail', {
      url: '/record-detail',
      params:{
          timeStamp: null,
          patientId: null,
          type: null
      },
      templateUrl: 'app/record/views/record.detail.html',
      controller: 'RecordDetailController',
      controllerAs: 'rDetail'
    })
    .state('register', {
      url: '/register',
      templateUrl: 'app/auth/register.html',
      controller: 'AuthController',
      controllerAs: 'auth'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'app/auth/login.html',
      controller: 'AuthController',
      controllerAs: 'auth'
    });

  $urlRouterProvider.otherwise('/');
}
