<?php
// db.php - Establish a database connection and create the users table if it doesn't exist

$config = require 'config.php';

// Create connection
$conn = new mysqli($config['host'], $config['user'], $config['password'], $config['database']);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create users table if it doesn't exist
$sql = "CREATE TABLE IF NOT EXISTS users (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    client_code VARCHAR(255) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    totp VARCHAR(255) NOT NULL,
    unique_code VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

// Execute the query
if ($conn->query($sql) === FALSE) {
    die("Error creating table: " . $conn->error);
}

return $conn; // Return the connection object
?>
