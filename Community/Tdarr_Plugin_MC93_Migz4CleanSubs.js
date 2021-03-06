function details() {
  return {
    id: "Tdarr_Plugin_MC93_Migz4CleanSubs",
    Stage: "Pre-processing",
    Name: "Migz-Clean subtitle streams",
    Type: "subtitles",
    Operation: "Clean",
    Description: `This plugin keeps only specified language subtitle tracks & can tag those that have an unknown language. \n\n`,
    Version: "2.3",
    Link:
      "https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/Community/Tdarr_Plugin_MC93_Migz4CleanSubs.js",
    Tags: "pre-processing,ffmpeg,subtitle only,configurable",
    Inputs: [
      {
        name: "language",
        tooltip: `Specify language tag/s here for the subtitle tracks you'd like to keep. Must follow ISO-639-2 3 letter format. https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
  	            \\nExample:\\n
  	            eng

  	            \\nExample:\\n
  	            eng,jap`,
      },
      {
        name: "commentary",
        tooltip: `Specify if subtitle tracks that contain commentary/description should be removed.
  	            \\nExample:\\n
  	            true

  	            \\nExample:\\n
  	            false`,
      },
      {
        name: "tag_language",
        tooltip: `Specify a single language for subtitle tracks with no language or unknown language to be tagged with, leave empty to disable. Must follow ISO-639-2 3 letter format. https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes
  	            \\nExample:\\n
  	            eng

  	            \\nExample:\\n
  	            por`,
      },
    ],
  };
}

function plugin(file, librarySettings, inputs) {
  var response = {
    processFile: false,
    preset: "",
    container: "." + file.container,
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: "",
  };

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== "video") {
    console.log("File is not video");
    response.infoLog += "☒File is not video \n";
    response.processFile = false;
    return response;
  }

  // Check if inputs.language has been configured. If it hasn't then exit plugin.
  if (inputs.language == "") {
    response.infoLog +=
      "☒Language/s keep have not been configured within plugin settings, please configure required options. Skipping this plugin.  \n";
    response.processFile = false;
    return response;
  }

  // Set up required variables.
  var language = inputs.language.split(",");
  var ffmpegCommandInsert = "";
  var subtitleIdx = 0;
  var convert = false;

  // Go through each stream in the file.
  for (var i = 0; i < file.ffProbeData.streams.length; i++) {
    // Catch error here incase the language metadata is completely missing.
    try {
      // Check if stream is subtitle AND checks if the tracks language code does not match any of the languages entered in inputs.language.
      if (
        file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle" &&
        language.indexOf(
          file.ffProbeData.streams[i].tags.language.toLowerCase()
        ) === -1
      ) {
        ffmpegCommandInsert += `-map -0:s:${subtitleIdx} `;
        response.infoLog += `☒Subtitle stream detected as being an unwanted language, removing. Subtitle stream 0:s:${subtitleIdx} - ${file.ffProbeData.streams[
          i
        ].tags.language.toLowerCase()} \n`;
        convert = true;
      }
    } catch (err) {}

    // Catch error here incase the title metadata is completely missing.
    try {
      // Check if inputs.commentary is set to true AND if stream is subtitle AND then checks for stream titles with the following "commentary, description, sdh". Removing any streams that are applicable.
      if (
        inputs.commentary.toLowerCase() == "true" &&
        file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle" &&
        (file.ffProbeData.streams[i].tags.title
          .toLowerCase()
          .includes("commentary") ||
          file.ffProbeData.streams[i].tags.title
            .toLowerCase()
            .includes("description") ||
          file.ffProbeData.streams[i].tags.title.toLowerCase().includes("sdh"))
      ) {
        ffmpegCommandInsert += `-map -0:s:${subtitleIdx} `;
        response.infoLog += `☒Subtitle stream detected as being Commentary or Description, removing. Subtitle stream 0:s:${subtitleIdx} - ${file.ffProbeData.streams[i].tags.title}. \n`;
        convert = true;
      }
    } catch (err) {}

    // Check if inputs.tag_language has something entered (Entered means user actually wants something to happen, empty would disable this) AND checks that stream is subtitle.
    if (
      inputs.tag_language != "" &&
      file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle"
    ) {
      // Catch error here incase the metadata is completely missing.
      try {
        // Look for subtitle with "und" as metadata language.
        if (
          file.ffProbeData.streams[i].tags.language
            .toLowerCase()
            .includes("und")
        ) {
          ffmpegCommandInsert += `-metadata:s:s:${subtitleIdx} language=${inputs.tag_language} `;
          response.infoLog += `☒Subtitle stream detected as having unknown language tagged, tagging as ${inputs.tag_language}. \n`;
          convert = true;
        }
      } catch (err) {}

      // Checks if the tags metadata is completely missing, if so this would cause playback to show language as "undefined". No catch error here otherwise it would never detect the metadata as missing.
      if (typeof file.ffProbeData.streams[i].tags == "undefined") {
        ffmpegCommandInsert += `-metadata:s:s:${subtitleIdx} language=${inputs.tag_language} `;
        response.infoLog += `☒Subtitle stream detected as having no language tagged, tagging as ${inputs.tag_language}. \n`;
        convert = true;
      }
      // Checks if the tags.language metadata is completely missing, if so this would cause playback to show language as "undefined". No catch error here otherwise it would never detect the metadata as missing.
      else {
        if (typeof file.ffProbeData.streams[i].tags.language == "undefined") {
          ffmpegCommandInsert += `-metadata:s:s:${subtitleIdx} language=${inputs.tag_language} `;
          response.infoLog += `☒Subtitle stream detected as having no language tagged, tagging as ${inputs.tag_language}. \n`;
          convert = true;
        }
      }
    }

    // Check if stream type is subtitle and increment subtitleIdx if true.
    if (file.ffProbeData.streams[i].codec_type.toLowerCase() == "subtitle") {
      subtitleIdx++;
    }
  }

  // Convert file if convert variable is set to true.
  if (convert === true) {
    response.processFile = true;
    response.preset = `, -map 0 ${ffmpegCommandInsert} -c copy -max_muxing_queue_size 9999`;
    response.container = "." + file.container;
    response.reQueueAfter = true;
  } else {
    response.processFile = false;
    response.infoLog +=
      "☑File doesn't contain subtitle tracks which are unwanted or that require tagging.\n";
  }
  return response;
}
module.exports.details = details;
module.exports.plugin = plugin;
