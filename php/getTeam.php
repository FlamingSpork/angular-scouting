<?php
include ("connect.php");
include ("functions.php");
header('Content-Type: application/json');

$teamNumber = isset($_GET["teamNumber"]) ? $_GET["teamNumber"] : -1;
$comments = array();
$timestamps = array();
$names = array();
$matchNumber = array();
$team = 0;

if ($teamNumber) {
	if (checkTeamData($db, $teamNumber)) {
		$response = array();

		//Comments query
		$query = "SELECT team, comments, UNIX_TIMESTAMP(timestamp) AS timestamp, name, match_number, rating
				FROM scout_data
				WHERE team = ?";
		if ($stmt = $db->prepare($query)){
			$stmt->bind_param("i", $teamNumber);
			$stmt->execute();
			$result = $stmt->get_result();
			if ($result) {
			   // $response["team"] = array();
				while ($row = $result->fetch_assoc()) {
					//print_r($row);
					$row['timestamp'] = timeAgo($row['timestamp']);
					$response['commentSection'][] = $row;
				}
			}
		} else {
			header($_SERVER['SERVER_PROTOCOL'] . '500 SQL Error', true, 500);
			die('{"error": "Failed to get comments"}');
		}

		//Boulders and endgame query
		$query = "SELECT match_number, end_game
			FROM scout_data WHERE team=?";
		if($stmt = $db->prepare($query)) {
			$stmt->bind_param("i", $teamNumber);
			$stmt->execute();
			$result = $stmt->get_result();
			if ($result) {
				while ($row = $result->fetch_assoc()) {
					$response["endgame"][] = array(
						"match_number" => $row["match_number"],
						"end_game" => $row["end_game"]
					);
				}
			}
		} else {
			header($_SERVER['SERVER_PROTOCOL'] . '500 SQL Error', true, 500);
			die('{"error": "Failed to get data"}');
		}

		$response["balls"] = getTeamBouldersTable($db, $teamNumber);
		$response['defenses'] = getTeamDefenseTable($db, $teamNumber);
		$response["rankingInfo"] = getTeamRankings($db, $teamNumber);
		$response["rankingInfo"]["autoString"] = getTeamAutoStringWTables($db, $teamNumber, $response['defenses'], $response["balls"]);
		$response['teamInfo'] = getTeamInfo($db, $teamNumber);
		echo(json_encode($response));
	} else {
		header('HTTP/1.1 500 Internal Server Error', true, 500);
		die('{"error": "No team data"}');
	}
} else {
    header($_SERVER['SERVER_PROTOCOL'] . '403 No headers', true, 403);
    die('{"error": "Failed to retrive team data"}');
}
?>
