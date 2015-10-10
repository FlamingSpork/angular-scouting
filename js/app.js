/*global angular, $*/

var Scouter = {
    id: 0,
    name: '',
    pswd: '',
    byteCoins: 0
};

var Requests = {
    teamNumber: 3506
};

var app;
app = angular.module('app', ['ngRoute']);

app.run(function ($rootScope, $location) {
    'use strict';
    $rootScope.loggedIn = false;
    $rootScope.showRedirectMessage = false;

//    $rootScope.$watch(function () {
//        return $location.path();
//    }, function () {
//        if (!$rootScope.loggedIn) {
//            $location.path("/");
//            $rootScope.showRedirectMessage = true;
//        } else {
//            $rootScope.showRedirectMessage = false;
//        }
//    });
});

app.controller('MainController', function ($rootScope, $scope, $http, $location) {
    'use strict';

    $scope.role = "What is your role?";
    $scope.path = "/";

    $scope.changeRole = function (role) {
        $scope.role = role;
    };

    $scope.goToPath = function () {
        Scouter.id = $scope.scouterId;
        Scouter.pswd = $scope.scouterPswd;
        $http.post('php/checkUser.php', {
                id: Scouter.id,
                pswd: Scouter.pswd
            })
            .then(function (response) {
                var result = response.data;
                if (result) {
                    $rootScope.showRedirectMessage = false;
                    $rootScope.loggedIn = true;
                    Scouter.name = result;
                    if ($scope.role === 'Scouter') {
                        $location.path("/form");
                    } else if ($scope.role === 'Wagerer') {
                        $location.path("/wager");
                    }
                } else {
                    //return an error or something
                }
            });
    };
});

app.controller('FormController', function ($rootScope, $scope, $http) {
    'use strict';

    $scope.formData = {
        stackRows: {
            rows: []
        },
        name: Scouter.name,
        id: Scouter.id,
        pswd: Scouter.pswd
    };

    $(document).ready(function () {
        $('#scouting_form').validate();
        console.log('Inititalize validation');
    });

    $scope.addStack = function () {
        $scope.formData.stackRows.rows.push({
            stacks_totes: '0',
            capped_stack: '0',
            cap_height: '0'
        });
    };

    $scope.removeStack = function (stack) {
        var rowNum = $scope.formData.stackRows.rows.indexOf(stack);
        $scope.formData.stackRows.rows.splice(rowNum, 1);
    };

    $scope.submit = function () {
        if ($('#scouting_form').valid()) {
            console.log("valid");
            $http.post('php/formSubmit.php', $scope.formData).then(function (response) {
                console.log("submitted");
                console.log(response);
                $('#scouting_form').trigger('reset');
                $('body').scrollTop(0);
                $("#scouting_form").before('<div id="success_message" class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"<span aria-hidden="true">&times;</span></button><strong>Success!</strong> Now do it again.</div>');
            }, function (response) {
                console.log("Error during submission");
                console.log(response);
            });
        } else {
            console.log("Not valid");
        }
    };
});

app.controller("ListController", function ($rootScope, $scope, $http, $location) {
    'use strict';
    $scope.sortType = 'rating';
    $scope.sortReverse = false;

    $scope.teamRedirect = function(teamNumber) {
        Requests.teamNumber = teamNumber;
        $location.path('/teamInfo');
    }
    
    $http.get('php/list.php').then(function (response) {
        $scope.data = response.data;
    });
});

app.controller("JoeBannanas", function ($rootScope, $scope, $http) {
    'use strict';

    $scope.refreshByteCoins = function () {
        $http.post("php/getByteCoins.php", {
            id: Scouter.id,
            pswd: Scouter.pswd
        }).then(function (response) {
            Scouter.byteCoins = response.data;
        }, function (response) {
            $scope.reportError("Could not properly get your number of Byte Coins. Are you logged in?");
        });
    };
    $scope.refreshByteCoins();

    $scope.reportSuccess = function (wager) {
        $scope.refreshByteCoins();
    };

    $scope.reportError = function (error) {
        //something like, "Sorry, we " + error + ", maybe try again?"
        $scope.lastError = error;
        $("#errorModal").modal('show');
    };

    $http.get("json/NCRE.json").then(function (response) {
        $scope.NCRE = response.data;
    }, function (response) {
        $scope.reportError("Failed to get match data");
    });


    $scope.toOptionLabel = function (teams) {
        return teams[0].teamNumber + "-" + teams[1].teamNumber + "-" +
            teams[2].teamNumber + " vs " + teams[3].teamNumber + "-" +
            teams[4].teamNumber + "-" + teams[5].teamNumber;
    };

    $scope.currentWager = {
        wagerType: '',
        wageredByteCoins: 0,
        alliancePredicted: '',
        matchPredicted: 0,
        withenPoints: 0,
        minPointsPredicted: 0,
        getValue: function () {
            if (this.wagerType === "alliance") {
                return this.wageredByteCoins * 2;
            } else if (this.wagerType === "closeMatch") {
                return ((parseInt(this.wageredByteCoins, 10) / parseInt(this.withenPoints, 10)) * 3) + parseInt(this.wageredByteCoins, 10); //Terrible scale, need to fix
            } else if (this.wagerType === "points") {
                if (this.minPointsPredicted > 110) {
                    return (parseInt(this.wageredByteCoins, 10) * Math.log(parseInt(this.minPointsPredicted, 10)) / 2); //Actually VERY NICE scale, thanks math ;)
                }
            }
            return 0;
        }
    };

    $scope.changeWager = function (wagerType) {
        $scope.currentWager.wagerType = wagerType;
    };
    //Templates
    $scope.allianceWager = {
        alliancePredicted: '',
        matchPredicted: 0
    };
    $scope.closeMatchWager = {
        withenPoints: 0, //People will get points if the scored points are less then the number set here (for predicting close games)
        matchPredicted: 0
    };
    $scope.pointsWager = {
        alliancePredicted: '',
        minPointsPredicted: 0, //only applies to allinaces, negative if less than
        matchPredicted: 0
    };

    $scope.sendWager = function () {
        var postObject = {};
        if ($scope.currentWager.wagerType === "alliance" && $scope.currentWager.alliancePredicted && $scope.currentWager.matchPredicted) {
            postObject = {
                associatedId: Scouter.id,
                pswd: Scouter.pswd,
                wagerType: "alliance",
                wageredByteCoins: $scope.currentWager.wageredByteCoins,
                matchPredicted: $scope.currentWager.matchPredicted,
                alliancePredicted: $scope.currentWager.alliancePredicted
            };
        } else if ($scope.currentWager.wagerType === "closeMatch" && $scope.currentWager.withenPoints && $scope.currentWager.matchPredicted) {
            postObject = {
                associatedId: Scouter.id,
                pswd: Scouter.pswd,
                wagerType: "closeMatch",
                wageredByteCoins: $scope.currentWager.wageredByteCoins,
                matchPredicted: $scope.currentWager.matchPredicted,
                withenPoints: $scope.currentWager.withenPoints
            };
        } else if ($scope.currentWager.wagerType === "points" && $scope.currentWager.pointsPredicted && $scope.currentWager.matchPredicted) {
            postObject = {
                associatedId: Scouter.id,
                pswd: Scouter.pswd,
                wagerType: "points",
                wageredByteCoins: $scope.currentWager.wageredByteCoins,
                matchPredicted: $scope.currentWager.matchPredicted,
                alliancePredicted: $scope.currentWager.alliancePredicted,
                withenPoints: $scope.currentWager.withenPoints
            };
        } else {
            $scope.reportError("Incorrect wager format. Did you fill all of the fields?");
        }
        $http.post("php/wager.php", postObject).then(function (response) {
            $scope.reportSuccess(postObject);
        }, function (response) {
            $scope.reportError("Failed to send Wager.");
        });
    };
});

app.controller("LeaderboardsController", function ($scope, $http) {
    'use strict';
    $scope.sortType = 'byteCoins';
    $scope.sortReverse = true;
    $http.get('php/leaderboards.php').then(function (response) {
        $scope.data = response.data;
    });
});

app.controller("TeamInfoController", function ($scope, $http) {
    'use strict';
    
    $scope.team = {
        number: 0,
        avgStackHeight: 0,
        avgStacksPerMatch: 0,
        heighestStackMade: 0,
        rating: 0
    }

    $scope.stacks = [];
    
    $scope.commentSection = {
        comments: []
    }

    $http.post("php/team.php", {
        teamNumber: Requests.teamNumber
    }).then(function (response) {
        $scope.stacks = response.stacks;
        for (var i = 0; i < response.data.commentSection['comments'].length; i++ ) {
            $scope.commentSection.comments.push({
                commentText: response.data.commentSection['comments'][i],
                timeStamp: response.data.commentSection['timestamps'][i],
                name: response.data.commentSection['names'][i],
                matchNumber: response.data.commentSection['matchNumbers'][i]
            });
        }
        console.log(response.data);
        $scope.team = response.data.teamSection;
        $scope.stacks = response.data.stacksSection;
        $scope.toteSupplys = response.data.toteSupplySection;
        $scope.coopTotes = response.data.coopSection;
        
    }, function (response) {
        $scope.team = {},
            $scope.stacks = []
    });
});

app.directive('stack', function () {
    'use strict';
    return {
        templateUrl: 'html/stack.html',
        scope: {
            removeStack: '&'
        }
    };
});

app.config(['$routeProvider', function ($routeProvider, $locationProvider) {
    'use strict';

    $routeProvider.when('/', {
        templateUrl: 'html/home.html',
        controller: 'MainController'
    }).when('/form', {
        templateUrl: 'html/form.html',
        controller: 'FormController'
    }).when('/wager', {
        templateUrl: 'html/TheCasino.html',
        controller: 'JoeBannanas'
    }).when("/list", {
        templateUrl: 'html/list.html',
        controller: 'ListController'
    }).when("/leaderboards", {
        templateUrl: 'html/leaderboards.html',
        controller: 'LeaderboardsController'
    }).when("/teamInfo", {
        templateUrl: 'html/team.html',
        controller: 'TeamInfoController'
    }).otherwise({
        redirectTo: '/'
    });
}]);
