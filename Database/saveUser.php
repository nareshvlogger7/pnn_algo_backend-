<?php
// serverUser.php - Handles user data and inserts it into the database

// Include the database connection
$conn = require 'db.php';

// Function to generate a unique code
function generateUniqueCode() {
    return 'user_' . time() . '_' . rand(0, 1000);
}

// Parse incoming JSON request
$requestPayload = file_get_contents('php://input');
$request = json_decode($requestPayload, true);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/saveUser') {
    // Retrieve the user inputs from the request body
    $clientCode = $request['clientCode'];
    $apiKey = $request['apiKey'];
    $password = $request['password'];
    $totp = $request['totp'];

    // Generate a unique code for the user
    $uniqueCode = generateUniqueCode();

    // Prepare the SQL query to insert user data
    $sql = "INSERT INTO users (client_code, api_key, password, totp, unique_code) VALUES (?, ?, ?, ?, ?)";

    try {
        // Prepare and bind the SQL statement
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('sssss', $clientCode, $apiKey, $password, $totp, $uniqueCode);

        // Execute the query
        if ($stmt->execute()) {
            // Send a success response
            echo json_encode(['success' => true, 'message' => "User saved successfully with unique code: $uniqueCode"]);
        } else {
            throw new Exception('Error executing the query: ' . $stmt->error);
        }

        // Close the statement and connection
        $stmt->close();
        $conn->close();

    } catch (Exception $e) {
        // Send error response
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => "Error: " . $e->getMessage()]);
    }

} else {
    // If the request is not POST or the URL is incorrect, return a 404 response
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
}
?>
