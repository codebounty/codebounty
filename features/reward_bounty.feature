Feature: Backer rewards a bounty
  After I posted a bounty and a commit has been referenced
  that solves my issue I want to reward the bounty

  Scenario: Developer rewards a bounty
    Given I posted a bounty on issue 25 in codebounty/codebounty
    Given I reward the USD bounty equally among the contributors
    Given I posted a bounty on issue 25 in codebounty/codebounty
    Given I reward the BTC bounty equally among the contributors
    Then there should be no remaining money on the issue
