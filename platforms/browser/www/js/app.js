angular.module('App', ['ui.router','firebase',ngSweetAlert2,'luegg.directives'])
    .service('fcm', function($q){
       this.start = function(){     
            FCMPlugin.onNotification(function(data){
                var date = data; 
                if(data.wasTapped){
                  //Notification was received on device tray and tapped by the user.
                  swal("Convidado Importante:",date.param1,'warning');
                }else{
                  //Notification was received in foreground. Maybe the user needs to be notified.
                  swal("Convidado Importante:",date.param1,'warning');
                }
            });
        }
    })
    .service('qrcode', function($q){
        this.scan = function(){
            var deferred;
            deferred = $q.defer();
            cordova.plugins.barcodeScanner.scan(
                function (result) {
                    if(!result.cancelled)
                    {
                        if(result.format == "QR_CODE")
                        {
                            var value = result.text;
                            deferred.resolve(value);
                        }
                    }
                },
                function (error) {
                    alert("Scanning failed: " + error);
                }
            );
            return deferred.promise;
        }
    })
    .service('todoService', function($q) {
        db = window.openDatabase('TodoDB', '1.0', 'TodoDB', 200000);
            this.config = function(fun, args){
                var arg = args;
                db.transaction(function(tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS configuracao (id integer primary key, serverIp varchar(255) DEFAULT NULL, notificationFlag varchar(3) DEFAULT NULL, userName varchar(255) DEFAULT NULL)');
                });
                switch(fun) {
                    case 'changeIp':
                        db.transaction(function(tx) {
                            tx.executeSql("insert or ignore into configuracao(id) values(0)",[], function(){
                                tx.executeSql("update configuracao set serverIp='"+args+"' where id = 0;");
                            });
                        })
                        break;
                    case 'subscribe':
                        FCMPlugin.subscribeToTopic('ConvidadoImportante');
                        db.transaction(function(tx) {
                            tx.executeSql("insert or ignore into configuracao(id) values(0)",[], function(){
                                tx.executeSql("update configuracao set notificationFlag='"+args+"' where id = 0;");
                            });
                        })
                        break;
                    case 'unsubscribeFromTopic':
                        FCMPlugin.unsubscribeFromTopic('ConvidadoImportante');
                        db.transaction(function(tx) {
                            tx.executeSql("insert or ignore into configuracao(id) values(0)",[], function(){
                                tx.executeSql("update configuracao set notificationFlag='"+args+"' where id = 0;");
                            });
                        })
                        break;
                    case 'userName':
                        db.transaction(function(tx) {
                            tx.executeSql("insert or ignore into configuracao(id) values(0)",[], function(){
                                tx.executeSql("update configuracao set userName='"+args+"' where id = 0;");
                            });
                        })
                        break;
                    default:
                        var deferred, result = [];
                        deferred = $q.defer();
                        db.transaction(function(tx) {
                            tx.executeSql("select * from configuracao", [], function(tx, res) {
                            result.push(res.rows[0]);
                            deferred.resolve(result);
                            });
                        })
                        return deferred.promise;
                }
            }
            this.getItems = function(create, table, arg) {
                var deferred, result = [];
                deferred = $q.defer();
                db.transaction(function(tx) {
                    tx.executeSql(create);
                    tx.executeSql("select * from " + table + arg, [], function(tx, res) {
                        for (var i = 0; i < res.rows.length; i++) {
                            result.push(res.rows[i]);
                        }

                        deferred.resolve(result);
                    });
                });

                return deferred.promise;
            },
            this.getEventoSelecionado = function(idEvento) {
                var deferred, result = [];
                deferred = $q.defer();
                db.transaction(function(tx) {
                    tx.executeSql("select * from evento where id = '" + idEvento + "'", [], function(tx, res) {

                        result.push(res.rows[0]);
                        deferred.resolve(result);
                    });
                });

                return deferred.promise;
            },
            this.setItemConvidados = function(item, create, insert) {
                var deferred = $q.defer();
                db.transaction(populateDB, errorCB, successCB);

                function populateDB(tx) {
                    for (var cont = 0; cont < item.length; cont++) {
                        //INSERT INTO customers (id, name) VALUES (2, 'Antônio Silva') ON DUPLICATE KEY UPDATE name = 'Antônio Silva';
                        tx.executeSql("insert or ignore into convidados(id, idEvento, idAutoridade) values('" + item[cont].id + "','" + item[cont].idEvento + "','" + item[cont].idAutoridade + "')");
                    }

                }

                function errorCB(err) {
                    console.log(err);
                }

                function successCB() {
                    deferred.resolve(true);
                }
                return deferred.promise;
            },
            this.updateConvidados = function(convidados, idEvento) {
                var deferred = $q.defer();
                var listaConfirmada = convidados;
                db.transaction(populateDB, errorCB, successCB);

                function populateDB(tx) {
                    for( item in convidados){
                        tx.executeSql("update convidados set presenca='s' where idAutoridade = '"+convidados[item].teste+"' and idEvento='"+idEvento+"'");
                    }
                }

                function errorCB(err) {
                    console.log(err);
                }

                function successCB() {
                    deferred.resolve(true);
                }
                return deferred.promise;
            },
            this.getConvidadosConfirmados = function(idEvento) {
                var deferred = $q.defer();
                var result = [];
                db.transaction(populateDB, errorCB);

                function populateDB(tx) {
                    tx.executeSql("select * from autoridades where id in (select idAutoridade from convidados where presenca='s' and idEvento='"+idEvento+"')",[], function(err,res){
                        for (var i = 0; i < res.rows.length; i++) {
                            result.push(res.rows[i]);
                        }
                        deferred.resolve(result);
                    });
                }

                function errorCB(err) {
                    console.log(err);
                }

                return deferred.promise;
            },
            this.setItemAutoridades = function(item, create, insert) {
                var deferred = $q.defer();
                db.transaction(populateDB, errorCB, successCB);

                function populateDB(tx) {
                    for (var cont = 0; cont < item.length; cont++) {
                        //INSERT INTO customers (id, name) VALUES (2, 'Antônio Silva') ON DUPLICATE KEY UPDATE name = 'Antônio Silva';
                        tx.executeSql(insert, [item[cont].id, item[cont].empresa, item[cont].nome, item[cont].apelido, item[cont].partido, item[cont].genero, item[cont].cep, item[cont].uf, item[cont].cidade, item[cont].bairro, item[cont].logradouro, item[cont].numero, item[cont].funcao, item[cont].nascimento, item[cont].tratamento, item[cont].titulo, item[cont].idUnidade]);
                    }
                }

                function errorCB(err) {
                    console.log(err);
                }

                function successCB() {
                    deferred.resolve(true);
                }
                return deferred.promise;
            },
            this.setItemBatalhao = function(item, create, insert) {
                db.transaction(function(tx) {
                    tx.executeSql(create);
                    return tx.executeSql(insert, [item.id, item.nome, item.nome_extenso, item.comandante, item.hierarquia, item.genero, item.cep, item.uf, item.cidade, item.bairro, item.logradouro, item.brasao], function(tx, res) {
                        return true;
                    });
                });
                return false;
            },
            this.setItem = function(item, create, insert) {
                db.transaction(function(tx) {
                    tx.executeSql(create);
                    return tx.executeSql(insert, [item.id, item.idUnidade, item.nome, item.data, item.hora, item.cep, item.uf, item.cidade, item.logradouro, item.bairro, item.numero, item.traje_pm, item.traje_civilvet, item.traje_ffaa], function(tx, res) {
                        return true;
                    });
                });
                return false;
            },
            this.removeItem = function(id) {
                db.transaction(function(tx) {
                    return tx.executeSql("DELETE FROM todos WHERE id = " + id, [], function(tx, res) {
                        return true;
                    });
                });
                return false;
            },
            this.getConvidados = function(idEvento) {
                var deferred = $q.defer();
                var result = [];
                db.transaction(populateDB, errorCB);

                function populateDB(tx) {
                    tx.executeSql("select a.*, c.presenca from autoridades a, convidados c where c.idEvento = '"+idEvento+"' and a.id= c.idAutoridade group by a.id", [], function(err, res) {
                        for (var i = 0; i < res.rows.length; i++) {
                            result.push(res.rows[i]);
                        }

                        deferred.resolve(result);
                    });
                }

                function errorCB(err) {
                    console.log(err);
                }
                return deferred.promise;
            },
            this.removeAll = function() {
                var deferred = $q.defer();
                db.transaction(function(tx) {
                    tx.executeSql("Drop table evento");
                    tx.executeSql("Drop table unidade");
                    tx.executeSql("Drop table autoridades");
                    return tx.executeSql("Drop table convidados");


                });
                deferred.resolve();
                return deferred.promise;
            }
    })
    .controller('mainController', ['$scope', '$http', '$state', 'todoService','fcm', function($scope, $http, $state, todoService,fcm) {
        //fcm.start();
       
        todoService.config('all','').then(function(item){
            if(item[0]){
                $scope.ipServidor = item[0].serverIp;
                $scope.user = item[0].userName;
                $scope.notificacao = { flag:true};
            }else{
                $scope.notificacao = { flag:false};
            }
        });
        $scope.username = function(name){
            $scope.user = name;
            todoService.config('userName', name);
        }
        $scope.notificacaoChange = function(){
            if($scope.notificacao.flag){
               todoService.config('subscribe', true);
            }else{
                todoService.config('unsubscribeFromTopic', false);
            }
            
        }
        $scope.setIpServidor = function(value){
            $scope.ipServidor = value;
            todoService.config('changeIp', value);
        }
        $scope.dashboard={
            "menuActive" : ''
        };
        $scope.loading = false;
        $scope.ContentTittle = "Policia Militar";
        $scope.createEvento = 'CREATE TABLE IF NOT EXISTS evento (id integer primary key, idUnidade int(11), nome varchar(255) DEFAULT NULL, data varchar(255) DEFAULT NULL,' +
            'hora varchar(255) DEFAULT NULL, cep varchar(255) DEFAULT NULL, uf varchar(4) DEFAULT NULL, cidade varchar(255) DEFAULT NULL, logradouro varchar(255) DEFAULT NULL,' +
            'bairro varchar(255) DEFAULT NULL,numero varchar(255) DEFAULT NULL, traje_pm varchar(255) DEFAULT NULL, traje_civilvet varchar(255) DEFAULT NULL,traje_ffaa varchar(255) DEFAULT NULL )';
        $scope.insertEvento = "insert into evento (id, idUnidade, nome, data, hora, cep, uf, cidade, logradouro, bairro , numero, traje_pm, traje_civilvet, traje_ffaa) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        $scope.createBatalhao = "CREATE TABLE IF NOT EXISTS unidade (id integer primary key, nome varchar(100) DEFAULT NULL,nome_extenso varchar(255) DEFAULT NULL, comandante varchar(100) DEFAULT NULL," +
            "hierarquia varchar(255) DEFAULT NULL,genero varchar(5) DEFAULT NULL,cep varchar(100) DEFAULT NULL,uf varchar(10) DEFAULT NULL,cidade varchar(255) DEFAULT NULL," +
            "bairro varchar(255) DEFAULT NULL,logradouro varchar(255) DEFAULT NULL,brasao varchar(255) DEFAULT NULL)";
        $scope.insertBatalhao = "insert into unidade (id, nome, nome_extenso, comandante, hierarquia, genero, cep, uf, cidade , bairro, logradouro, brasao) values(?,?,?,?,?,?,?,?,?,?,?,?)";
        $scope.createAutoridade = "CREATE TABLE IF NOT EXISTS autoridades (id integer primary key,empresa varchar(255) DEFAULT NULL, nome varchar(255) DEFAULT NULL," +
            "apelido varchar(255) DEFAULT NULL, partido varchar(255) DEFAULT NULL, genero varchar(5) DEFAULT NULL, cep varchar(255) DEFAULT NULL, uf varchar(255) DEFAULT NULL," +
            "cidade varchar(255) DEFAULT NULL, bairro varchar(255) DEFAULT NULL, logradouro varchar(255) DEFAULT NULL, numero int(11) DEFAULT NULL," +
            "funcao varchar(255) DEFAULT NULL, nascimento varchar(255) DEFAULT NULL, tratamento varchar(255) DEFAULT NULL, titulo varchar(255) DEFAULT NULL," +
            "idUnidade varchar(255) DEFAULT NULL)";
        $scope.insertAutoridade = "insert into autoridades (id,empresa,nome,apelido, partido, genero,cep,uf,cidade,bairro,logradouro,numero,funcao,nascimento,tratamento,titulo,idUnidade) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        $scope.createConvidados = "CREATE TABLE IF NOT EXISTS convidados (id integer primary key, idEvento int(11) DEFAULT NULL, idAutoridade int(11) DEFAULT NULL, presenca varchar(10) DEFAULT NULL)";
        $scope.insertConvidados = "insert into convidados(id, idEvento, idAutoridade) values(?,?,?)";
        $scope.eventos = "";

        $scope.abastecerEventos = function() {
            $http({
                method: 'GET',
                url: 'http://'+$scope.ipServidor+'/eventosC'
            }).then(function successCallback(response) {
                $scope.eventos = response.data.evento;

                angular.forEach(response.data.evento, function(value, key) {
                    todoService.setItem(value, $scope.createEvento, $scope.insertEvento);
                });

            }, function errorCallback(response) {
                $scope.batalhao = response;
            });

        }

        $scope.abastecerBatalhao = function() {
            $http({
                method: 'GET',
                url: 'http://'+$scope.ipServidor+'/batalhaoApp'
            }).then(function successCallback(response) {
                $scope.batalhao = response.data.unidade;

                angular.forEach(response.data.unidade, function(value, key) {
                    todoService.setItemBatalhao(value, $scope.createBatalhao, $scope.insertBatalhao);
                });
            }, function errorCallback(response) {
                $scope.batalhao = response;
            });

        }
        $scope.abastecerAutoridades = function() {
            $scope.loading = true;
            $http({
                method: 'GET',
                url: 'http://'+$scope.ipServidor+'/autoridades'
            }).then(function successCallback(response) {
                $scope.loading = true;
                todoService.setItemAutoridades(response.data, $scope.createAutoridade, $scope.insertAutoridade).then(function(flag) {
                    $scope.autoridades = flag;
                    $scope.loading = false;
                });

            }, function errorCallback(response) {
                $scope.autoridades = response;
            });

        }
        $scope.abastecerConvidados = function() {
            $http({
                method: 'GET',
                url: 'http://'+$scope.ipServidor+'/convidadosApp'
            }).then(function successCallback(response) {
                $scope.loading = true;
                todoService.setItemConvidados(response.data, $scope.createConvidados, $scope.insertConvidados).then(function(flag) {
                    $scope.convidados = flag;
                    $scope.loading = false;
                });

            }, function errorCallback(response) {
                $scope.autoridades = response;
            });
        }
        todoService.getItems($scope.createEvento, 'evento', ' order by data').then(function(items) {

            $scope.eventos = items;

        });
        todoService.getItems($scope.createBatalhao, 'unidade', ' order by nome').then(function(items) {
            $scope.batalhao = items;
        });
        todoService.getItems($scope.createAutoridade, 'autoridades', ' order by nome').then(function(items) {
            if (items[0] == null) $scope.autoridades = false;
            else $scope.autoridades = true;
        });
        todoService.getItems($scope.createConvidados, 'convidados', ' ').then(function(items) {
            if (items[0] == null) $scope.convidados = false;
            else $scope.convidados = true;
        });

        $scope.go = function(id) {

            $state.go('eventos', {
                idEvento: id
            });

        }
        $scope.configuracao = function() {

            $state.go('configuracao');

        }
        $scope.removeAll = function() {
            todoService.removeAll().then(function() {
                todoService.getItems($scope.createEvento, 'evento', ' order by data').then(function(items) {
                    $scope.eventos = items;
                });
                todoService.getItems($scope.createBatalhao, 'unidade', ' order by nome').then(function(items) {
                    $scope.batalhao = items;
                });
                todoService.getItems($scope.createAutoridade, 'autoridades', ' order by nome').then(function(items) {
                    if (items[0] == null) $scope.autoridades = false;
                });
                todoService.getItems($scope.createConvidados, 'convidados', ' order by id').then(function(items) {
                    if (items[0] == null) $scope.convidados = false;
                });
            });

        }

    }])
    .controller('chatController', ['$scope','$firebaseArray','todoService', function($scope,$firebaseArray,todoService){
        var ref =  firebase.database().ref();
        
        var obj = $firebaseArray(ref.child($scope.idEvento).child('messages'));
        ref.child($scope.idEvento).child('messages').on("value", function(snapshot) {
            $scope.messages = snapshot.val();
        });
        $scope.inserisci = function(message){
            message.user = $scope.user;
            obj.$add(message);
        };

    }])
    .controller('eventosController', function($scope, $stateParams, $http, todoService,$firebaseArray,$filter) {
        if ($stateParams.idEvento) {
            $scope.idEvento = $stateParams.idEvento;
        }
        $scope.dashboard.menuActive = 'Home';
        $scope.setHomeMenuLi = function(){
         $scope.dashboard.menuActive = 'Home';
        };
        $scope.attConvidadosConfirmados = function(){
            todoService.getConvidadosConfirmados($scope.idEvento).then(function(item){
                $scope.convidadosConfirmados = item;
            });
        }
        $scope.ref =  firebase.database().ref();
        $scope.obj = $firebaseArray($scope.ref.child($stateParams.idEvento).child('convidados'));
        $scope.ref.child($stateParams.idEvento).child('convidados').on("value", function(snapshot) {
            todoService.updateConvidados(snapshot.val(), $stateParams.idEvento).then(function(){
                $scope.attConvidadosConfirmados();
                todoService.getConvidados($stateParams.idEvento).then(function(res) {
                    $scope.autoridadesConvidados = res;
                });
            });
        });
        todoService.getEventoSelecionado($stateParams.idEvento).then(function(item) {
            $scope.eventoSelected = item[0];
        });
        todoService.getConvidados($stateParams.idEvento).then(function(res) {
            $scope.autoridadesConvidados = res;
        });
    })
    .controller('qrcodeController',['$scope', 'qrcode','$firebaseArray','todoService','$filter','$http', function($scope, qrcode, $firebaseArray, todoService,$filter, $http) {
        $scope.dashboard.menuActive = 'QRCode';
        $scope.presencaConvidados = [];
        $scope.convidadoSingle = function (idd,flag){
            $scope.convidadoInfo= $filter('filter')($scope.autoridadesConvidados, {id: parseInt(idd)}, true)[0];
            if(flag){
                var datas = {
                    "notification":{
                    "title":"Convidado com Presença Confirmada",
                    "body":$scope.convidadoInfo.nome,
                    "sound":"default",
                    "click_action":"FCM_PLUGIN_ACTIVITY",
                    "icon":"fcm_push_icon"
                    },
                    "data":{
                    "param1":"Uma nova autoridade chegou ao evento:"+$scope.convidadoInfo.nome ,
                    "param2":""
                    },
                    "to":"/topics/ConvidadoImportante",
                    "priority":"high",
                    "restricted_package_name":"br.com.policiaapp"
                };

               $http({
                    method: 'POST', 
                    url: 'https://fcm.googleapis.com/fcm/send', 
                    headers: {'Authorization': 'key=AIzaSyC_740qsSvnvlgvvNxVJ72D0mbzCn69GEc'},
                    data: datas
                }).then(function(arg){
                    
                }, function(arg){
                    
                });
            }else{
                console.log($scope.convidadoInfo);
                swal('Convidado com Presença Confirmada: \n'+
                    "Nome: "+$scope.convidadoInfo.nome+ "\nPartido: "+$scope.convidadoInfo.partido+"\nFunção: "+$scope.convidadoInfo.funcao+"\nTratamento: "+$scope.convidadoInfo.tratamento);
            }
        }
        $scope.scanner = function(){
            qrcode.scan().then(function(text){
                
                if(text.split(',')[0] == $scope.idEvento){
                    text = text.split(',')[1];
                    swal('warning',text,'error');
                    $scope.flag  = $filter('filter')($scope.convidadosConfirmados, {id:parseInt(text)}, true);
                    if(!$scope.flag || !$scope.flag[0]){
                        $scope.convidadoInfo= $filter('filter')($scope.autoridadesConvidados, {id: parseInt(text)})[0];
                        swal({
                            title: "Confirmar a presença do convidado:",
                            text: $scope.convidadoInfo.nome,
                            type: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                            confirmButtonText: 'Sim, prossiga!'
                        }).then(function(){
                            $scope.obj.$add({'teste':parseInt(text)});
                            $scope.convidadoSingle(text, true);
                          swal(
                            'Sucesso!',
                            'Presença confirmada para o convidado: '+$scope.convidadoInfo.nome,
                            'success'
                          );
                        });
                    }else{
                        swal("Opss...","Usuario com presença ja confirmada","warning");
                    }
                }else{
                     swal("Opss...","Este convidado não pertence a este Evento.","warning");
                }
            });

        }

    }])
    .controller('viewController',['$scope', 'qrcode','$firebaseArray','todoService','$filter','$http', function($scope, qrcode, $firebaseArray, todoService,$filter,$http) {

        $scope.dashboard.menuActive = 'Autoridades';
        $scope.scanner = function(text,nome,flag){
            $scope.flag  = $filter('filter')($scope.convidadosConfirmados, {id: text}, true);
            

                if(!$scope.flag || !$scope.flag[0]){
                    swal({
                        title: "Você tem certeza?",
                        text: "Convidado com presença a ser confirmada: "+nome,
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Sim, prossiga!'
                    }).then(function(){
                       $scope.obj.$add({'teste':text});
                        $scope.convidadoSingle(text, flag);
                      swal(
                        'Sucesso!',
                        'Presença confirmada para o convidado: '+nome,
                        'success'
                      );
                    });
                    
                }else{
                    swal("Opss...","Convidado com presença ja confirmada","warning");
                }

        }
        $scope.convidadoSingle = function (idd,flag){
            $scope.convidadoInfo= $filter('filter')($scope.autoridadesConvidados, {id: idd})[0];

            if(flag){
                var datas = {
                    "notification":{
                    "title":"Convidado com Presença Confirmada",
                    "body":$scope.convidadoInfo.nome,
                    "sound":"default",
                    "click_action":"FCM_PLUGIN_ACTIVITY",
                    "icon":"fcm_push_icon"
                    },
                    "data":{
                    "param1":"Uma nova autoridade chegou ao evento:"+$scope.convidadoInfo.nome,
                    "param2":""
                    },
                    "to":"/topics/ConvidadoImportante",
                    "priority":"high",
                    "restricted_package_name":"br.com.policiaapp"
                };
               $http({
                    method: 'POST', 
                    url: 'https://fcm.googleapis.com/fcm/send', 
                    headers: {'Authorization': 'key=AIzaSyC_740qsSvnvlgvvNxVJ72D0mbzCn69GEc'},
                    data: datas
                }).then(function(arg){

                }, function(arg){

                });
            }
        }
    }])
    .config(function($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/');
        $stateProvider
            .state('index', {
                url: '/'
            })
            .state('eventos', {
                url: '/evento/:idEvento',
                controller: 'eventosController',
                templateUrl: 'partials/eventos.html'
            })
            .state('configuracao', {
                url: '/configuracao',
                templateUrl: 'partials/configuracao.html'
            })
            .state('eventos.autoridadesConvidadas', {
                url: '/autoridadesConvidadas',
                controller: "viewController",
                templateUrl: 'partials/view.html'
            })
//            .state('eventos.chat', {
//                url: '/chat',
//                templateUrl: 'partials/chat.html'
//            })
            .state('eventos.qrcode',{
                url:'/qrcode',
                controller: 'qrcodeController',
                templateUrl: 'partials/qrcode.html'
            })
    })
    .run(function($rootScope) {
        $rootScope.$on('$stateChangeSuccess', function() {
           document.body.scrollTop = document.documentElement.scrollTop = 0;
        });
    });
angular.module('App').config(['$compileProvider',
    function($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file):/);
    }
]);
