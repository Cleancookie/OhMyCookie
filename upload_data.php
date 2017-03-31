<?php
$img = $_POST['hidden_data'];
$file = 'testyerd.txt';
file_put_contents($file, $img);
echo $img;
?>