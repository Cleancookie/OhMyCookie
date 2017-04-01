<?php
$mouseLocation = array(
'old_x' => $_POST['mouse_x'],
'old_y' => $_POST['mouse_y'],
'mouse_x' => $_POST['old_x'],
'mouse_y' => $_POST['old_y']);

$file = 'mouseLocation.json';
file_put_contents($file, json_encode($mouseLocation, JSON_FORCE_OBJECT));
echo "Done";
?>