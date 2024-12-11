<?php
header('Content-Type: application/json');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Access-Control-Allow-Origin: https://bskyhealth.plover.net");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(['error' => 'Method not allowed']));
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!isset($data['handle'])) {
    http_response_code(400);
    die(json_encode(['error' => 'Missing handle']));
}

$allowedUsers = json_decode(file_get_contents('/home/dave/bskyhealth/config/allowed-users.json'), true);
if ($allowedUsers === null) {
    http_response_code(500);
    die(json_encode(['error' => 'Configuration error']));
}

$handle = strtolower(trim($data['handle']));
$allowed = in_array($handle, array_map('strtolower', $allowedUsers));

$logEntry = date('Y-m-d H:i:s') . " | " . $_SERVER['REMOTE_ADDR'] . " | $handle | " . ($allowed ? 'allowed' : 'denied') . "\n";
file_put_contents('/home/dave/bskyhealth/logs/access.log', $logEntry, FILE_APPEND);

usleep(500000);

die(json_encode([
    'allowed' => $allowed,
    'message' => $allowed ? 'Access granted' : 'Access denied'
]));