// Feel free to add more images!
// Put them into the folder titled "images" within the folder blockSites
// Make sure to add in the same position in both the images and altTexts arrays
	// By same position, I mean that the fireworks picture is the first in 
	// the list in both the images and altTexts
// Remember to put a comma at the end of each line (except the last one)

// I've added some comments of examples for images with the file
// names "your-image-here1.jpeg". Simple delete the double slashes at the 
// beginning of the line and it will work!
const images = [
	"./images/fireworks.jpeg",
	"./images/grass.jpeg",
	// "./images/your-image-here1.jpeg",
	// "./images/your-image-here2.jpeg",
	// "./images/your-image-here3.jpeg",
	"./images/squirrel.png",
	"./images/geyser.jpeg",
	"./images/bee.jpeg",
	"./images/tree.jpeg"
	];
const altTexts = [
	"two red circular fireworks errupting in black sky",
	"strands of grass level and close to the camera, bigger cacti are out of focus in the background",
	// "alt text here about your image1",
	// "alt text here about your image2",
	// "alt text here about your image3",
	"gray and brown squirrel looks with one eye towards the camera, the background is blurred",
	"geyser errupting, the base is white rock, there are short trees in the distance, the sky is blue",
	"bee on a pink petal on gray stone on the ground, with blurred green plants in the background", 
	"green and orange tree leaves in front of blue sky with few clouds"
	];

window.addEventListener("load", function() {
	let randImage = document.getElementById("newImage");
	let rand = Math.floor(Math.random() * images.length); 
	// the alt text array has the same index as the photo in the images array
	randImage.src = images[rand];
	randImage.alt = altTexts[rand];
})