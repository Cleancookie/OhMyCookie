<?php
$file = 'mouseLocation.json';
$string = file_get_contents($file);
echo $json_decode($string);
?>