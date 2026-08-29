import React, { Component } from "react";

// Split a skill group's comma-separated items without breaking on the commas
// inside parentheses, e.g. "AWS (EC2, Amplify, Cognito)" stays one tag.
function splitItems(items) {
  var out = [];
  var depth = 0;
  var current = "";
  for (var i = 0; i < items.length; i++) {
    var ch = items[i];
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

class Resume extends Component {
  render() {
    if (this.props.data) {
      var skillmessage = this.props.data.skillmessage;
      var education = this.props.data.education.map(function (education) {
        return (
          <div key={education.school}>
            <h3>{education.school}</h3>
            <p className="info">
              {education.degree} <span>&bull;</span>
              <em className="date">{education.graduated}</em>
            </p>
            <p>
              <i className="fa fa-check"></i>
              {education.description}
            </p>
          </div>
        );
      });
      var work = this.props.data.work.map(function (work) {
        return (
          <div key={work?.company}>
            <h3>{work?.company}</h3>
            <p className="info">
              {work?.title}
              <span>&bull;</span> <em className="date">{work?.years}</em>
            </p>
            <ul className="disc">
              {work?.highlights?.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </div>
        );
      });
      // Prefer the grouped skills; fall back to the flat list if absent.
      var groups = this.props.data.skillGroups;
      if (!groups && this.props.data.skills) {
        groups = [
          {
            label: "Skills",
            items: this.props.data.skills.map((s) => s.name).join(", "),
          },
        ];
      }
      var skills = (groups || []).map(function (group) {
        return (
          <div className="skill-group" key={group.label}>
            <h4>{group.label}</h4>
            <ul className="skill-tags">
              {splitItems(group.items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        );
      });
    }

    return (
      <section id="resume">
        <div className="row education">
          <div className="three columns header-col">
            <h1>
              <span>Education</span>
            </h1>
          </div>

          <div className="nine columns main-col">
            <div className="row item">
              <div className="twelve columns">{education}</div>
            </div>
          </div>
        </div>

        <div className="row work">
          <div className="three columns header-col">
            <h1>
              <span>Work</span>
            </h1>
          </div>

          <div className="nine columns main-col">{work}</div>
        </div>

        <div className="row skill">
          <div className="three columns header-col">
            <h1>
              <span>Skills</span>
            </h1>
          </div>

          <div className="nine columns main-col">
            <p className="skill-message">{skillmessage}</p>

            <div className="skill-groups">{skills}</div>
          </div>
        </div>
      </section>
    );
  }
}

export default Resume;
